import { getPool, normalizePermissions, readJsonBody, requireAuth, requireMethod, sendJson } from './_db.js';

const defaultPermissions = normalizePermissions();

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT'])) return;

  try {
    if (request.method === 'GET') {
      if (!await requireAuth(request, response, { menu: 'settings', action: 'view' })) return;
      sendJson(response, 200, { accounts: await fetchAccounts() });
      return;
    }

    const permission = request.method === 'POST'
      ? { menu: 'settings', action: 'create' }
      : { menu: 'settings', action: 'update' };
    if (!await requireAuth(request, response, permission)) return;

    const body = await readJsonBody(request);
    const account = request.method === 'POST'
      ? await createAccount(body.account)
      : await updateAccount(body.account);

    sendJson(response, 200, { account, accounts: await fetchAccounts() });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { message: '계정 처리 중 오류가 발생했습니다.' });
  }
}

async function fetchAccounts() {
  const pool = getPool();
  const { rows } = await pool.query(`
    select
      user_account.id,
      user_account.username,
      user_account.display_name,
      user_account.role,
      user_account.status,
      user_account.is_active,
      user_account.last_signed_in_at,
      coalesce(
        array_agg(user_store.store_id order by user_store.store_id)
          filter (where user_store.store_id is not null),
        '{}'
      ) as store_ids,
      coalesce(user_permission.permissions, $1::jsonb) as permissions
    from public.app_users user_account
    left join public.app_user_stores user_store
      on user_store.user_id = user_account.id
    left join public.app_user_permissions user_permission
      on user_permission.user_id = user_account.id
    group by user_account.id, user_permission.permissions
    order by user_account.created_at
  `, [JSON.stringify(defaultPermissions)]);

  return rows.map(mapAccount);
}

async function createAccount(account) {
  const nextAccount = normalizeAccount(account);
  const client = await getPool().connect();

  try {
    await client.query('begin');
    const { rows } = await client.query(
      `
        insert into public.app_users (
          username, display_name, password_hash, role, status, is_active
        )
        values ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6)
        returning id, username, display_name, role, status, is_active, last_signed_in_at
      `,
      [
        nextAccount.username,
        nextAccount.displayName,
        nextAccount.password || nextAccount.username,
        nextAccount.role,
        nextAccount.status,
        nextAccount.status === 'active',
      ],
    );
    await replaceAccountStores(client, rows[0].id, nextAccount.storeIds);
    await upsertPermissions(client, rows[0].id, nextAccount.permissions);
    await client.query('commit');
    return mapAccount({ ...rows[0], store_ids: nextAccount.storeIds, permissions: nextAccount.permissions });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function updateAccount(account) {
  const nextAccount = normalizeAccount(account, true);
  const client = await getPool().connect();

  try {
    await client.query('begin');
    const { rows } = await client.query(
      `
        update public.app_users
        set
          username = $2,
          display_name = $3,
          role = $4,
          status = $5,
          is_active = $6
        where id = $1
        returning id, username, display_name, role, status, is_active, last_signed_in_at
      `,
      [
        nextAccount.id,
        nextAccount.username,
        nextAccount.displayName,
        nextAccount.role,
        nextAccount.status,
        nextAccount.status === 'active',
      ],
    );

    if (!rows[0]) throw new Error('계정을 찾을 수 없습니다.');

    await replaceAccountStores(client, rows[0].id, nextAccount.storeIds);
    await upsertPermissions(client, rows[0].id, nextAccount.permissions);
    await client.query('commit');
    return mapAccount({ ...rows[0], store_ids: nextAccount.storeIds, permissions: nextAccount.permissions });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function replaceAccountStores(client, userId, storeIds) {
  await client.query('delete from public.app_user_stores where user_id = $1', [userId]);

  for (const storeId of storeIds) {
    await client.query(
      'insert into public.app_user_stores (user_id, store_id) values ($1, $2) on conflict do nothing',
      [userId, storeId],
    );
  }
}

async function upsertPermissions(client, userId, permissions) {
  await client.query(
    `
      insert into public.app_user_permissions (user_id, permissions)
      values ($1, $2)
      on conflict (user_id) do update
      set permissions = excluded.permissions
    `,
    [userId, JSON.stringify(permissions)],
  );
}

function normalizeAccount(account, requireId = false) {
  if (!account || typeof account !== 'object') {
    throw new Error('계정 데이터 형식이 올바르지 않습니다.');
  }

  const username = String(account.username ?? '').trim();
  const displayName = String(account.displayName ?? '').trim();
  const role = account.role === 'viewer' ? 'viewer' : 'manager';
  const status = ['active', 'inactive'].includes(account.status) ? account.status : 'active';
  const id = String(account.id ?? '').trim();

  if (requireId && !id) throw new Error('계정 ID가 필요합니다.');
  if (!username || !displayName) throw new Error('이름과 아이디는 필수입니다.');

  return {
    id,
    username,
    displayName,
    role,
    status,
    password: String(account.password ?? ''),
    storeIds: Array.isArray(account.storeIds)
      ? [...new Set(account.storeIds.map(String).filter(Boolean))]
      : [],
    permissions: normalizePermissions(account.permissions),
  };
}

function mapAccount(row) {
  const status = row.status || (row.is_active ? 'active' : 'inactive');

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status,
    storeIds: row.store_ids ?? [],
    permissions: normalizePermissions(row.permissions),
    lastSignedInAt: row.last_signed_in_at ? row.last_signed_in_at.toISOString?.() ?? row.last_signed_in_at : null,
  };
}
