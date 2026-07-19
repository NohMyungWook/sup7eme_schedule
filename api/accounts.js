import crypto from 'node:crypto';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  isSuperAdmin,
  normalizePermissions,
  permissionsForRole,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  withTransaction,
} from './_db.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
const VALID_ROLES = new Set(['super_admin', 'manager', 'employee']);

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'PATCH'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    assertPermission(auth, 'accounts', request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : 'update');

    if (request.method === 'GET') {
      sendJson(response, 200, { accounts: await fetchAccounts(auth) });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'PATCH') {
      const result = await resetPassword(auth, body);
      sendJson(response, 200, { ...result, accounts: await fetchAccounts(auth) });
      return;
    }

    const result = request.method === 'POST'
      ? await createAccount(auth, body.account)
      : await updateAccount(auth, body.account);
    sendJson(response, 200, { ...result, accounts: await fetchAccounts(auth) });
  } catch (error) {
    sendApiError(response, error, '계정 처리 중 오류가 발생했습니다.');
  }
}

async function fetchAccounts(auth) {
  const result = await getPool().query(
    `
      select
        user_account.id,
        user_account.username,
        user_account.display_name,
        user_account.role,
        user_account.status,
        user_account.is_active,
        user_account.employee_id,
        employee.name as employee_name,
        user_account.must_change_password,
        user_account.last_signed_in_at,
        coalesce(
          array_agg(user_store.store_id order by user_store.store_id)
            filter (where user_store.store_id is not null),
          '{}'
        ) as store_ids,
        coalesce(user_permission.permissions, '{}'::jsonb) as permissions
      from public.app_users user_account
      left join public.employees employee on employee.id = user_account.employee_id
      left join public.app_user_stores user_store on user_store.user_id = user_account.id
      left join public.app_user_permissions user_permission on user_permission.user_id = user_account.id
      where
        $1::boolean
        or user_account.id = $2::uuid
        or (
          user_account.role = 'employee'
          and exists (
            select 1
            from public.app_user_stores scoped_store
            where scoped_store.user_id = user_account.id
              and scoped_store.store_id = any($3::text[])
          )
        )
      group by user_account.id, employee.name, user_permission.permissions
      order by
        case user_account.role when 'super_admin' then 0 when 'manager' then 1 else 2 end,
        user_account.created_at
    `,
    [isSuperAdmin(auth), auth.id, auth.storeIds],
  );
  return result.rows.map(mapAccount);
}

async function createAccount(auth, account) {
  const next = await normalizeAccount(auth, account);
  if (next.role !== 'employee' && !isSuperAdmin(auth)) {
    throw new ApiError(403, '매니저 계정은 최고 관리자만 생성할 수 있습니다.');
  }

  const initialPassword = next.password || createInitialPassword();
  const created = await withTransaction(async (client) => {
    const result = await client.query(
      `
        insert into public.app_users (
          username, display_name, password_hash, role, status, is_active,
          employee_id, must_change_password
        )
        values ($1, $2, crypt($3, gen_salt('bf', 10)), $4, $5, $6, $7, true)
        returning id, username, display_name, role, status, is_active,
          employee_id, must_change_password, last_signed_in_at
      `,
      [next.username, next.displayName, initialPassword, next.role, next.status, next.status === 'active', next.employeeId],
    );
    const row = result.rows[0];
    await replaceAccountStores(client, row.id, next.storeIds);
    await upsertPermissions(client, row.id, next.permissions);
    return mapAccount({ ...row, employee_name: next.employeeName, store_ids: next.storeIds, permissions: next.permissions });
  });

  return { account: created, initialPassword };
}

async function updateAccount(auth, account) {
  const id = assertId(account?.id, '계정 ID');
  const currentResult = await getPool().query(
    'select id, role, employee_id, status from public.app_users where id = $1 limit 1',
    [id],
  );
  const current = currentResult.rows[0];
  if (!current) throw new ApiError(404, '계정을 찾을 수 없습니다.');
  if (!isSuperAdmin(auth) && current.role !== 'employee') {
    throw new ApiError(403, '관리자 계정은 최고 관리자만 수정할 수 있습니다.');
  }

  const next = await normalizeAccount(auth, account);
  if (!isSuperAdmin(auth) && next.role !== current.role) {
    throw new ApiError(403, '역할 변경은 최고 관리자만 할 수 있습니다.');
  }
  if (next.role !== 'employee' && !isSuperAdmin(auth)) {
    throw new ApiError(403, '관리자 계정을 수정할 권한이 없습니다.');
  }

  const accountRow = await withTransaction(async (client) => {
    const lockedResult = await client.query(
      'select id, role, employee_id, status from public.app_users where id = $1 for update',
      [id],
    );
    const lockedCurrent = lockedResult.rows[0];
    if (!lockedCurrent) throw new ApiError(404, '계정을 찾을 수 없습니다.');
    if (!isSuperAdmin(auth) && lockedCurrent.role !== 'employee') {
      throw new ApiError(403, '관리자 계정은 최고 관리자만 수정할 수 있습니다.');
    }
    if (!isSuperAdmin(auth) && next.role !== lockedCurrent.role) {
      throw new ApiError(403, '역할 변경은 최고 관리자만 할 수 있습니다.');
    }
    await assertSuperAdminContinuity(client, lockedCurrent, next);
    const result = await client.query(
      `
        update public.app_users
        set username = $2,
            display_name = $3,
            role = $4,
            status = $5,
            is_active = $6,
            employee_id = $7
        where id = $1
        returning id, username, display_name, role, status, is_active,
          employee_id, must_change_password, last_signed_in_at
      `,
      [id, next.username, next.displayName, next.role, next.status, next.status === 'active', next.employeeId],
    );
    await replaceAccountStores(client, id, next.storeIds);
    await upsertPermissions(client, id, next.permissions);
    return mapAccount({ ...result.rows[0], employee_name: next.employeeName, store_ids: next.storeIds, permissions: next.permissions });
  });

  return { account: accountRow };
}

async function resetPassword(auth, body) {
  if (body?.action !== 'reset-password') throw new ApiError(400, '지원하지 않는 계정 작업입니다.');
  const accountId = assertId(body.accountId, '계정 ID');
  const targetResult = await getPool().query(
    `
      select user_account.id, user_account.role,
        coalesce(array_agg(user_store.store_id) filter (where user_store.store_id is not null), '{}') as store_ids
      from public.app_users user_account
      left join public.app_user_stores user_store on user_store.user_id = user_account.id
      where user_account.id = $1
      group by user_account.id
    `,
    [accountId],
  );
  const target = targetResult.rows[0];
  if (!target) throw new ApiError(404, '계정을 찾을 수 없습니다.');
  if (!isSuperAdmin(auth)) {
    if (target.role !== 'employee' || !target.store_ids.length || !target.store_ids.every((storeId) => auth.storeIds.includes(storeId))) {
      throw new ApiError(403, '이 계정의 비밀번호를 초기화할 권한이 없습니다.');
    }
  }

  const initialPassword = createInitialPassword();
  const resetResult = await getPool().query(
    `
      update public.app_users
      set password_hash = crypt($2, gen_salt('bf', 10)),
          must_change_password = true,
          password_changed_at = now()
      where id = $1
        and (
          $3::boolean
          or (
            role = 'employee'
            and exists (select 1 from public.app_user_stores own_store where own_store.user_id = app_users.id)
            and not exists (
              select 1 from public.app_user_stores outside_store
              where outside_store.user_id = app_users.id
                and outside_store.store_id <> all($4::text[])
            )
          )
        )
      returning id
    `,
    [accountId, initialPassword, isSuperAdmin(auth), auth.storeIds],
  );
  if (!resetResult.rows[0]) throw new ApiError(409, '계정 범위가 변경되었습니다. 새로고침 후 다시 시도해주세요.', 'STALE_DATA');
  return { accountId, initialPassword };
}

async function normalizeAccount(auth, account) {
  if (!account || typeof account !== 'object') throw new ApiError(400, '계정 데이터 형식이 올바르지 않습니다.');
  const username = String(account.username ?? '').trim();
  const displayName = String(account.displayName ?? '').trim();
  const role = String(account.role ?? 'employee');
  const status = account.status === 'inactive' ? 'inactive' : 'active';
  const employeeId = role === 'employee' ? assertId(account.employeeId, '연결 직원') : null;

  if (!USERNAME_PATTERN.test(username)) throw new ApiError(400, '아이디는 영문, 숫자, 점, 밑줄, 하이픈으로 3~50자여야 합니다.');
  if (!displayName || displayName.length > 80) throw new ApiError(400, '이름은 1~80자로 입력해주세요.');
  if (!VALID_ROLES.has(role)) throw new ApiError(400, '올바르지 않은 역할입니다.');

  let employeeName = null;
  let storeIds = uniqueIds(account.storeIds);
  if (role === 'employee') {
    const result = await getPool().query(
      `
        select employee.id, employee.name, employee.is_active,
          coalesce(array_agg(employee_store.store_id) filter (where employee_store.store_id is not null), '{}') as store_ids
        from public.employees employee
        left join public.employee_stores employee_store on employee_store.employee_id = employee.id
        where employee.id = $1
        group by employee.id
      `,
      [employeeId],
    );
    const employee = result.rows[0];
    if (!employee) throw new ApiError(404, '연결할 직원을 찾을 수 없습니다.');
    if (!employee.is_active) throw new ApiError(409, '비활성화된 직원에게 신규 계정을 연결할 수 없습니다.');
    employeeName = employee.name;
    storeIds = employee.store_ids;
  }

  for (const storeId of storeIds) assertStoreAccess(auth, storeId);
  if (role === 'manager' && !storeIds.length) throw new ApiError(400, '매니저 담당 매장을 한 곳 이상 선택해주세요.');

  const password = String(account.password ?? '');
  if (password && (password.length < 8 || password.length > 128)) {
    throw new ApiError(400, '초기 비밀번호는 8자 이상 128자 이하로 입력해주세요.');
  }
  return {
    username,
    displayName: role === 'employee' ? employeeName : displayName,
    password,
    role,
    status,
    employeeId,
    employeeName,
    storeIds,
    permissions: role === 'employee'
      ? permissionsForRole('employee')
      : normalizePermissions(account.permissions, role),
  };
}

async function assertSuperAdminContinuity(client, current, next) {
  if (current.role !== 'super_admin' || (next.role === 'super_admin' && next.status === 'active')) return;
  const result = await client.query(
    `select id from public.app_users where role = 'super_admin' and status = 'active' and is_active = true for update`,
  );
  if (result.rows.length <= 1) throw new ApiError(409, '마지막 최고 관리자 계정은 비활성화하거나 역할을 변경할 수 없습니다.');
}

async function replaceAccountStores(client, userId, storeIds) {
  await client.query('delete from public.app_user_stores where user_id = $1', [userId]);
  if (!storeIds.length) return;
  await client.query(
    `
      insert into public.app_user_stores (user_id, store_id)
      select $1::uuid, store_id
      from unnest($2::text[]) as store_id
      on conflict do nothing
    `,
    [userId, storeIds],
  );
}

async function upsertPermissions(client, userId, permissions) {
  await client.query(
    `
      insert into public.app_user_permissions (user_id, permissions)
      values ($1, $2::jsonb)
      on conflict (user_id) do update set permissions = excluded.permissions
    `,
    [userId, JSON.stringify(permissions)],
  );
}

function mapAccount(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status || (row.is_active ? 'active' : 'inactive'),
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? null,
    storeIds: row.store_ids ?? [],
    permissions: normalizePermissions(row.permissions, row.role),
    mustChangePassword: Boolean(row.must_change_password),
    lastSignedInAt: row.last_signed_in_at ? row.last_signed_in_at.toISOString?.() ?? row.last_signed_in_at : null,
  };
}

function createInitialPassword() {
  return `K${crypto.randomBytes(9).toString('base64url')}!`;
}

function uniqueIds(values) {
  return Array.isArray(values) ? [...new Set(values.map(String).filter(Boolean))] : [];
}

function assertId(value, label) {
  const id = String(value ?? '').trim();
  if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(id)) throw new ApiError(400, `${label} 형식이 올바르지 않습니다.`);
  return id;
}
