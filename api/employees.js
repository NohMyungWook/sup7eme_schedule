import crypto from 'node:crypto';
import { shiftsOverlap } from '../shared/schedule.js';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  permissionsForRole,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  withTransaction,
} from './_db.js';
import {
  assertColor,
  assertId,
  assertText,
  assertTime,
  normalizeDbTime,
  queryParams,
  toDateString,
  uniqueIds,
} from './_validation.js';

const EMPLOYMENT_STATUSES = new Set(['active', 'inactive', 'terminated']);

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'PATCH'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    if (request.method === 'GET') {
      assertPermission(auth, 'employees', 'view');
      const params = queryParams(request);
      const employees = await fetchEmployees(auth, {
        includeInactive: params.get('includeInactive') === 'true',
        storeId: params.get('storeId'),
        search: params.get('search'),
      });
      sendJson(response, 200, { employees });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'PATCH') {
      if (body.action === 'set-status') {
        assertPermission(auth, 'employees', body.status === 'active' ? 'update' : 'delete');
      } else if (body.action === 'issue-account') {
        assertPermission(auth, 'accounts', 'create');
      } else {
        throw new ApiError(400, '지원하지 않는 직원 작업입니다.');
      }
      const result = await handleEmployeeAction(auth, body);
      sendJson(response, 200, result);
      return;
    }

    assertPermission(auth, 'employees', request.method === 'POST' ? 'create' : 'update');

    const result = request.method === 'POST'
      ? await createEmployee(auth, body.employee, body.account)
      : await updateEmployee(auth, body.employee);
    sendJson(response, request.method === 'POST' ? 201 : 200, result);
  } catch (error) {
    sendApiError(response, error, '직원 정보를 처리하지 못했습니다.');
  }
}

async function fetchEmployees(auth, filters) {
  const requestedStoreId = filters.storeId ? assertId(filters.storeId, '근무지 ID') : null;
  if (requestedStoreId) assertStoreAccess(auth, requestedStoreId);
  const search = String(filters.search ?? '').trim().slice(0, 80);
  const result = await getPool().query(
    `
      select
        employee.id,
        employee.name,
        employee.memo,
        employee.color,
        employee.is_active,
        employee.employment_status,
        employee.created_at,
        employee.updated_at,
        user_account.id as account_id,
        user_account.username,
        user_account.status as account_status,
        coalesce(
          (select array_agg(employee_store.store_id order by store.sort_order, store.name)
           from public.employee_stores employee_store
           join public.stores store on store.id = employee_store.store_id
           where employee_store.employee_id = employee.id),
          '{}'
        ) as store_ids,
        coalesce(
          (select jsonb_agg(jsonb_build_object(
            'id', base_shift.id,
            'storeId', base_shift.store_id,
            'weekday', base_shift.weekday,
            'templateId', base_shift.template_id,
            'startTime', base_shift.start_time,
            'endTime', base_shift.end_time
          ) order by base_shift.store_id, base_shift.weekday, base_shift.start_time)
           from public.employee_base_shifts base_shift
           where base_shift.employee_id = employee.id),
          '[]'::jsonb
        ) as base_shifts
      from public.employees employee
      left join public.app_users user_account on user_account.employee_id = employee.id
      where employee.deleted_at is null
        and ($1::boolean or employee.is_active = true)
        and ($2::text is null or exists (
          select 1 from public.employee_stores filter_store
          where filter_store.employee_id = employee.id and filter_store.store_id = $2
        ))
        and ($3::text = '' or employee.name ilike '%' || $3 || '%' or employee.memo ilike '%' || $3 || '%')
        and exists (
          select 1 from public.employee_stores scoped_store
          where scoped_store.employee_id = employee.id and scoped_store.store_id = any($4::text[])
        )
      order by employee.sort_order, employee.created_at
    `,
    [filters.includeInactive, requestedStoreId, search, auth.storeIds],
  );
  return result.rows.map(mapEmployee);
}

async function createEmployee(auth, employee, accountInput) {
  const next = await normalizeEmployee(auth, employee);
  const account = accountInput ? normalizeEmployeeAccount(accountInput, next.name) : null;
  const initialPassword = account ? account.password || createInitialPassword() : null;

  const created = await withTransaction(async (client) => {
    const result = await client.query(
      `
        insert into public.employees (
          id, name, memo, color, is_active, employment_status, sort_order
        )
        values (
          $1, $2, $3, $4, true, 'active',
          coalesce((select max(sort_order) + 1 from public.employees), 1)
        )
        returning id, name, memo, color, is_active, employment_status, created_at, updated_at
      `,
      [next.id, next.name, next.preference, next.color],
    );
    await replaceEmployeeStores(client, next.id, next.storeIds);
    await replaceBaseShifts(client, next.id, next.baseShifts);

    let accountRow = null;
    if (account) {
      const accountResult = await client.query(
        `
          insert into public.app_users (
            username, display_name, password_hash, role, status, is_active,
            employee_id, must_change_password
          )
          values ($1, $2, crypt($3, gen_salt('bf', 10)), 'employee', 'active', true, $4, true)
          returning id, username, status
        `,
        [account.username, next.name, initialPassword, next.id],
      );
      accountRow = accountResult.rows[0];
      await replaceAccountStores(client, accountRow.id, next.storeIds);
      await client.query(
        'insert into public.app_user_permissions (user_id, permissions) values ($1, $2::jsonb) on conflict (user_id) do update set permissions = excluded.permissions',
        [accountRow.id, JSON.stringify(permissionsForRole('employee'))],
      );
    }

    return mapEmployee({
      ...result.rows[0],
      account_id: accountRow?.id ?? null,
      username: accountRow?.username ?? null,
      account_status: accountRow?.status ?? null,
      store_ids: next.storeIds,
      base_shifts: next.baseShifts,
    });
  });

  return { employee: created, ...(initialPassword ? { initialPassword } : {}) };
}

async function updateEmployee(auth, employee) {
  const id = assertId(employee?.id, '직원 ID');
  await assertEmployeeAccess(auth, id);
  const currentAssociations = await fetchEmployeeAssociations(id);
  const next = await normalizeEmployee(auth, { ...employee, id }, currentAssociations);
  const expectedUpdatedAt = employee.updatedAt ? new Date(employee.updatedAt) : null;
  if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) throw new ApiError(400, '직원 수정 시각이 올바르지 않습니다.');

  const updated = await withTransaction(async (client) => {
    const result = await client.query(
      `
        update public.employees
        set name = $2, memo = $3, color = $4
        where id = $1
          and deleted_at is null
          and ($5::timestamptz is null
            or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $5::timestamptz))
        returning id, name, memo, color, is_active, employment_status, created_at, updated_at
      `,
      [id, next.name, next.preference, next.color, expectedUpdatedAt?.toISOString() ?? null],
    );
    if (!result.rows[0]) {
      const exists = await client.query('select id from public.employees where id = $1 and deleted_at is null', [id]);
      if (!exists.rows[0]) throw new ApiError(404, '직원을 찾을 수 없습니다.');
      throw new ApiError(409, '다른 사용자가 먼저 직원 정보를 수정했습니다. 새로고침 후 다시 시도해주세요.', 'STALE_DATA');
    }
    await replaceEmployeeStores(client, id, next.storeIds);
    await replaceBaseShifts(client, id, next.baseShifts);
    const accountResult = await client.query(
      `update public.app_users set display_name = $2 where employee_id = $1 returning id, username, status`,
      [id, next.name],
    );
    if (accountResult.rows[0]) await replaceAccountStores(client, accountResult.rows[0].id, next.storeIds);

    return mapEmployee({
      ...result.rows[0],
      account_id: accountResult.rows[0]?.id ?? null,
      username: accountResult.rows[0]?.username ?? null,
      account_status: accountResult.rows[0]?.status ?? null,
      store_ids: next.storeIds,
      base_shifts: next.baseShifts,
    });
  });
  return { employee: updated };
}

async function handleEmployeeAction(auth, body) {
  const employeeId = assertId(body?.employeeId, '직원 ID');
  await assertEmployeeAccess(auth, employeeId);

  if (body.action === 'set-status') {
    const status = String(body.status ?? '');
    if (!EMPLOYMENT_STATUSES.has(status)) throw new ApiError(400, '재직 상태가 올바르지 않습니다.');
    if (status !== 'active') {
      const currentAssociations = await fetchEmployeeAssociations(employeeId);
      if (currentAssociations.storeIds.some((storeId) => !auth.storeIds.includes(storeId))) {
        throw new ApiError(403, '담당 범위 밖 근무지에도 소속된 직원은 비활성화할 수 없습니다.');
      }
    }
    const result = await withTransaction(async (client) => {
      const updated = await client.query(
        `update public.employees
         set employment_status = $2, is_active = ($2 = 'active')
         where id = $1
         returning id, name, employment_status, is_active`,
        [employeeId, status],
      );
      if (!updated.rows[0]) throw new ApiError(404, '직원을 찾을 수 없습니다.');
      if (status !== 'active') {
        await client.query(
          `update public.app_users set status = 'inactive', is_active = false where employee_id = $1`,
          [employeeId],
        );
      }
      return updated.rows[0];
    });
    return { employeeId, status: result.employment_status, isActive: result.is_active };
  }

  if (body.action === 'issue-account') {
    const username = String(body.username ?? '').trim();
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      throw new ApiError(400, '아이디는 영문, 숫자, 점, 밑줄, 하이픈으로 3~50자여야 합니다.');
    }
    const current = await getPool().query(
      `select employee.name,
        coalesce(array_agg(employee_store.store_id) filter (where employee_store.store_id is not null), '{}') as store_ids,
        max(user_account.id::text) as account_id
       from public.employees employee
       left join public.employee_stores employee_store on employee_store.employee_id = employee.id
       left join public.app_users user_account on user_account.employee_id = employee.id
       where employee.id = $1 and employee.is_active = true
       group by employee.id`,
      [employeeId],
    );
    const employee = current.rows[0];
    if (!employee) throw new ApiError(404, '활성 직원을 찾을 수 없습니다.');
    if (employee.account_id) throw new ApiError(409, '이미 연결된 계정이 있습니다.');
    const requestedPassword = String(body.password ?? '');
    if (requestedPassword && (requestedPassword.length < 8 || requestedPassword.length > 128)) throw new ApiError(400, '초기 비밀번호는 8자 이상 128자 이하로 입력해주세요.');
    const initialPassword = requestedPassword || createInitialPassword();
    const account = await withTransaction(async (client) => {
      const created = await client.query(
        `insert into public.app_users (
           username, display_name, password_hash, role, status, is_active, employee_id, must_change_password
         ) values ($1, $2, crypt($3, gen_salt('bf', 10)), 'employee', 'active', true, $4, true)
         returning id, username`,
        [username, employee.name, initialPassword, employeeId],
      );
      await replaceAccountStores(client, created.rows[0].id, employee.store_ids);
      await client.query(
        'insert into public.app_user_permissions (user_id, permissions) values ($1, $2::jsonb)',
        [created.rows[0].id, JSON.stringify(permissionsForRole('employee'))],
      );
      return created.rows[0];
    });
    return { accountId: account.id, username: account.username, initialPassword };
  }

  throw new ApiError(400, '지원하지 않는 직원 작업입니다.');
}

async function normalizeEmployee(auth, employee, currentAssociations = { storeIds: [], baseShifts: [] }) {
  if (!employee || typeof employee !== 'object') throw new ApiError(400, '직원 데이터 형식이 올바르지 않습니다.');
  const requestedStoreIds = uniqueIds(employee.storeIds, '근무 가능 매장 ID');
  const inaccessibleCurrentStoreIds = currentAssociations.storeIds.filter((storeId) => !auth.storeIds.includes(storeId));
  for (const storeId of requestedStoreIds) {
    if (!auth.storeIds.includes(storeId) && !currentAssociations.storeIds.includes(storeId)) {
      assertStoreAccess(auth, storeId);
    }
  }
  const storeIds = [...new Set([
    ...requestedStoreIds.filter((storeId) => auth.storeIds.includes(storeId)),
    ...inaccessibleCurrentStoreIds,
  ])];
  if (!storeIds.length) throw new ApiError(400, '근무 가능 매장을 한 곳 이상 선택해주세요.');

  const storeResult = await getPool().query(
    'select id from public.stores where id = any($1::text[]) and is_active = true',
    [storeIds],
  );
  if (storeResult.rows.length !== storeIds.length) throw new ApiError(409, '비활성화되었거나 존재하지 않는 근무지가 포함되어 있습니다.');

  const requestedBaseShifts = Array.isArray(employee.baseShifts) ? employee.baseShifts : [];
  const editableBaseShifts = normalizeBaseShifts(
    requestedBaseShifts.filter((shift) => auth.storeIds.includes(String(shift?.storeId ?? ''))),
    storeIds,
  );
  const preservedBaseShifts = currentAssociations.baseShifts.filter((shift) => !auth.storeIds.includes(shift.storeId));
  const baseShifts = normalizeBaseShifts([...editableBaseShifts, ...preservedBaseShifts], storeIds);
  if (editableBaseShifts.length) {
    const templateIds = [...new Set(editableBaseShifts.map((shift) => shift.templateId))];
    const templateResult = await getPool().query(
      'select id from public.shift_templates where id = any($1::text[]) and is_active = true',
      [templateIds],
    );
    if (templateResult.rows.length !== templateIds.length) throw new ApiError(409, '비활성화되었거나 존재하지 않는 시간대가 포함되어 있습니다.');
  }

  return {
    id: employee.id ? assertId(employee.id, '직원 ID') : crypto.randomUUID(),
    name: assertText(employee.name, '직원 이름', 80),
    preference: assertText(employee.preference ?? employee.memo ?? '', '직원 메모', 500, false),
    color: assertColor(employee.color, '#dceeff'),
    storeIds,
    baseShifts,
  };
}

async function fetchEmployeeAssociations(employeeId) {
  const result = await getPool().query(
    `select
       coalesce((
         select array_agg(employee_store.store_id order by employee_store.store_id)
         from public.employee_stores employee_store
         where employee_store.employee_id = $1
       ), '{}') as store_ids,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', base_shift.id,
           'storeId', base_shift.store_id,
           'weekday', base_shift.weekday,
           'templateId', base_shift.template_id,
           'startTime', base_shift.start_time,
           'endTime', base_shift.end_time
         ))
         from public.employee_base_shifts base_shift
         where base_shift.employee_id = $1
       ), '[]'::jsonb) as base_shifts`,
    [employeeId],
  );
  return {
    storeIds: result.rows[0]?.store_ids ?? [],
    baseShifts: (result.rows[0]?.base_shifts ?? []).map((shift) => ({
      ...shift,
      weekday: Number(shift.weekday),
      startTime: normalizeDbTime(shift.startTime),
      endTime: normalizeDbTime(shift.endTime),
    })),
  };
}

function normalizeBaseShifts(input, storeIds) {
  if (!Array.isArray(input)) return [];
  if (input.length > 200) throw new ApiError(400, '기본 근무는 직원당 최대 200건까지 등록할 수 있습니다.');
  const shifts = input.map((rule) => {
    const storeId = assertId(rule?.storeId, '기본 근무 매장 ID');
    if (!storeIds.includes(storeId)) throw new ApiError(400, '근무 가능 매장에 포함되지 않은 기본 근무가 있습니다.');
    const weekday = Number(rule?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new ApiError(400, '기본 근무 요일이 올바르지 않습니다.');
    return {
      id: rule?.id ? assertId(rule.id, '기본 근무 ID') : crypto.randomUUID(),
      storeId,
      weekday,
      templateId: assertId(rule?.templateId, '시간대 ID'),
      startTime: assertTime(rule?.startTime, '시작 시간', false),
      endTime: assertTime(rule?.endTime, '종료 시간', true),
    };
  });

  for (let leftIndex = 0; leftIndex < shifts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < shifts.length; rightIndex += 1) {
      const left = shifts[leftIndex];
      const right = shifts[rightIndex];
      const leftDate = weekdayDate(left.weekday);
      const rightDate = weekdayDate(right.weekday);
      if (shiftsOverlap(
        { date: leftDate, startTime: left.startTime, endTime: left.endTime },
        { date: rightDate, startTime: right.startTime, endTime: right.endTime },
      )) {
        throw new ApiError(409, '같은 요일에 시간이 겹치는 기본 근무를 등록할 수 없습니다.');
      }
    }
  }
  return shifts;
}

async function assertEmployeeAccess(auth, employeeId) {
  const result = await getPool().query(
    `select 1
     from public.employee_stores employee_store
     join public.employees employee on employee.id = employee_store.employee_id
     where employee_store.employee_id = $1
       and employee.deleted_at is null
       and employee_store.store_id = any($2::text[])
     limit 1`,
    [employeeId, auth.storeIds],
  );
  if (!result.rows[0]) throw new ApiError(403, '해당 직원에 접근할 권한이 없습니다.');
}

async function replaceEmployeeStores(client, employeeId, storeIds) {
  await client.query('delete from public.employee_stores where employee_id = $1', [employeeId]);
  await client.query(
    `insert into public.employee_stores (employee_id, store_id)
     select $1, store_id from unnest($2::text[]) as store_id`,
    [employeeId, storeIds],
  );
}

async function replaceBaseShifts(client, employeeId, baseShifts) {
  await client.query('delete from public.employee_base_shifts where employee_id = $1', [employeeId]);
  if (!baseShifts.length) return;
  await client.query(
    `
      insert into public.employee_base_shifts (
        id, employee_id, store_id, weekday, template_id, start_time, end_time
      )
      select row.id, $1, row.store_id, row.weekday, row.template_id, row.start_time, row.end_time
      from jsonb_to_recordset($2::jsonb) as row(
        id text, store_id text, weekday smallint, template_id text, start_time text, end_time text
      )
    `,
    [employeeId, JSON.stringify(baseShifts.map((shift) => ({
      id: shift.id,
      store_id: shift.storeId,
      weekday: shift.weekday,
      template_id: shift.templateId,
      start_time: shift.startTime,
      end_time: shift.endTime,
    })))],
  );
}

async function replaceAccountStores(client, accountId, storeIds) {
  await client.query('delete from public.app_user_stores where user_id = $1', [accountId]);
  if (!storeIds.length) return;
  await client.query(
    `insert into public.app_user_stores (user_id, store_id)
     select $1::uuid, store_id from unnest($2::text[]) as store_id`,
    [accountId, storeIds],
  );
}

function normalizeEmployeeAccount(account, displayName) {
  const username = String(account.username ?? '').trim();
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new ApiError(400, '직원 로그인 아이디 형식이 올바르지 않습니다.');
  const password = String(account.password ?? '');
  if (password && (password.length < 8 || password.length > 128)) throw new ApiError(400, '초기 비밀번호는 8자 이상 128자 이하로 입력해주세요.');
  return { username, displayName, password };
}

function mapEmployee(row) {
  return {
    id: row.id,
    name: row.name,
    preference: row.memo ?? '',
    color: row.color,
    storeIds: row.store_ids ?? [],
    baseShifts: (row.base_shifts ?? []).map((shift) => ({
      ...shift,
      startTime: normalizeDbTime(shift.startTime ?? shift.start_time),
      endTime: normalizeDbTime(shift.endTime ?? shift.end_time),
    })),
    isActive: Boolean(row.is_active),
    employmentStatus: row.employment_status,
    accountId: row.account_id,
    username: row.username,
    accountStatus: row.account_status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function weekdayDate(weekday) {
  const day = 7 + weekday;
  return `2024-01-${String(day).padStart(2, '0')}`;
}

function createInitialPassword() {
  return `K${crypto.randomBytes(9).toString('base64url')}!`;
}
