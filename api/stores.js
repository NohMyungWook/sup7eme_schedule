import crypto from 'node:crypto';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  isSuperAdmin,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  withTransaction,
} from './_db.js';
import { assertColor, assertId, assertText, queryParams } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    const permissionAction = request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : request.method === 'DELETE' ? 'delete' : 'update';
    assertPermission(auth, 'settings', permissionAction);

    if (request.method === 'GET') {
      const includeInactive = queryParams(request).get('includeInactive') === 'true';
      sendJson(response, 200, { stores: await fetchStores(auth, includeInactive) });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'DELETE') {
      const result = await deactivateStore(auth, body.storeId);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST') {
      if (!isSuperAdmin(auth)) throw new ApiError(403, '근무지 추가는 최고 관리자만 처리할 수 있습니다.');
      const store = normalizeStore({ ...body.store, id: body.store?.id || crypto.randomUUID() });
      const saved = await upsertStores(auth, [store]);
      sendJson(response, 201, { store: saved[0], stores: await fetchStores(auth, false) });
      return;
    }

    const stores = Array.isArray(body.stores)
      ? body.stores.map(normalizeStore)
      : [normalizeStore(body.store)];
    const saved = await upsertStores(auth, stores);
    sendJson(response, 200, { stores: saved });
  } catch (error) {
    sendApiError(response, error, '근무지 정보를 처리하지 못했습니다.');
  }
}

async function fetchStores(auth, includeInactive) {
  const result = await getPool().query(
    `
      select
        store.id, store.name, store.address, store.phone, store.memo,
        store.is_active, store.color, store.sort_order, store.created_at, store.updated_at,
        (select count(*)::int
         from public.employee_stores employee_store
         join public.employees employee on employee.id = employee_store.employee_id
         where employee_store.store_id = store.id and employee.is_active = true) as employee_count,
        (select count(*)::int
         from public.employee_base_shifts base_shift
         where base_shift.store_id = store.id) as base_shift_count,
        (select count(*)::int
         from public.shifts shift
         where shift.store_id = store.id and shift.status = 'scheduled') as schedule_count
      from public.stores store
      where ($1::boolean or store.is_active = true)
        and ($2::boolean or store.id = any($3::text[]))
      order by store.sort_order, store.name
    `,
    [includeInactive, isSuperAdmin(auth), auth.storeIds],
  );
  return result.rows.map(mapStore);
}

async function upsertStores(auth, stores) {
  if (!stores.length) throw new ApiError(400, '저장할 근무지가 없습니다.');
  if (stores.length > 100) throw new ApiError(400, '근무지는 한 번에 최대 100개까지 저장할 수 있습니다.');
  const ids = stores.map((store) => store.id);
  const existing = await getPool().query('select id from public.stores where id = any($1::text[])', [ids]);
  const existingIds = new Set(existing.rows.map((row) => row.id));
  if (!isSuperAdmin(auth) && stores.some((store) => !existingIds.has(store.id))) {
    throw new ApiError(403, '근무지 추가는 최고 관리자만 처리할 수 있습니다.');
  }
  for (const store of stores) {
    if (existingIds.has(store.id)) assertStoreAccess(auth, store.id);
  }

  const result = await getPool().query(
    `
      insert into public.stores (
        id, name, address, phone, memo, is_active, color, sort_order
      )
      select row.id, row.name, row.address, row.phone, row.memo, row.is_active, row.color, row.sort_order
      from jsonb_to_recordset($1::jsonb) as row(
        id text, name text, address text, phone text, memo text,
        is_active boolean, color text, sort_order integer
      )
      on conflict (id) do update
      set name = excluded.name,
          address = excluded.address,
          phone = excluded.phone,
          memo = excluded.memo,
          is_active = excluded.is_active,
          color = excluded.color,
          sort_order = excluded.sort_order
      returning id, name, address, phone, memo, is_active, color, sort_order, created_at, updated_at
    `,
    [JSON.stringify(stores.map((store, index) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      memo: store.memo,
      is_active: store.isActive,
      color: store.color,
      sort_order: index + 1,
    })))],
  );
  const byId = new Map(result.rows.map((row) => [row.id, mapStore(row)]));
  return stores.map((store) => byId.get(store.id));
}

async function deactivateStore(auth, storeIdInput) {
  const storeId = assertId(storeIdInput, '근무지 ID');
  assertStoreAccess(auth, storeId);
  return withTransaction(async (client) => {
    const storeResult = await client.query(
      'select id, name, is_active from public.stores where id = $1 for update',
      [storeId],
    );
    const store = storeResult.rows[0];
    if (!store) throw new ApiError(404, '근무지를 찾을 수 없습니다.');
    if (!store.is_active) throw new ApiError(409, '이미 운영 중지된 근무지입니다.');
    const activeCount = await client.query('select count(*)::int as count from public.stores where is_active = true');
    if (activeCount.rows[0].count <= 1) throw new ApiError(409, '마지막 활성 근무지는 운영 중지할 수 없습니다.');
    const impact = await client.query(
      `select
        (select count(*)::int from public.shifts where store_id = $1) as schedule_count,
        (select count(*)::int from public.employee_stores where store_id = $1) as employee_count,
        (select count(*)::int from public.employee_base_shifts where store_id = $1) as base_shift_count`,
      [storeId],
    );
    await client.query('update public.stores set is_active = false where id = $1', [storeId]);
    return { storeId, status: 'inactive', impact: impact.rows[0] };
  });
}

function normalizeStore(store) {
  if (!store || typeof store !== 'object') throw new ApiError(400, '근무지 데이터 형식이 올바르지 않습니다.');
  return {
    id: assertId(store.id, '근무지 ID'),
    name: assertText(store.name, '근무지 이름', 80),
    address: assertText(store.address ?? '', '주소', 200, false),
    phone: assertText(store.phone ?? '', '연락처', 40, false),
    memo: assertText(store.memo ?? '', '메모', 500, false),
    isActive: store.isActive !== false,
    color: assertColor(store.color, 'purple'),
  };
}

function mapStore(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    phone: row.phone ?? '',
    memo: row.memo ?? '',
    isActive: Boolean(row.is_active),
    color: row.color,
    employeeCount: Number(row.employee_count ?? 0),
    baseShiftCount: Number(row.base_shift_count ?? 0),
    scheduleCount: Number(row.schedule_count ?? 0),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
