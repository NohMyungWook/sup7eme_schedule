import { getPool, hasPermission, readJsonBody, requireAuth, requireMethod, sendJson } from './_db.js';

const ID_PATTERN = /^[a-zA-Z0-9:_-]{1,100}$/;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const COLOR_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['PUT', 'DELETE'])) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    const body = await readJsonBody(request);

    if (request.method === 'DELETE') {
      if (!hasPermission(auth.permissions, 'settings', 'delete')) {
        sendJson(response, 403, { message: '삭제 권한이 없습니다.' });
        return;
      }
      const storeId = assertId(body.storeId);
      await deleteStore(storeId);
      sendJson(response, 200, { storeId });
      return;
    }

    const stores = normalizeStores(body.stores);
    await saveStores(auth, stores);
    sendJson(response, 200, { stores });
  } catch (error) {
    if (error instanceof ValidationError) {
      sendJson(response, 400, { message: error.message });
      return;
    }
    if (error instanceof PermissionError) {
      sendJson(response, 403, { message: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { message: '근무지 정보를 처리하지 못했습니다.' });
  }
}

async function deleteStore(storeId) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const countResult = await client.query('select count(*)::int as count from public.stores');
    if (countResult.rows[0].count <= 1) throw new ValidationError('최소 1개의 근무지는 필요합니다.');
    const result = await client.query('delete from public.stores where id = $1 returning id', [storeId]);
    if (!result.rowCount) throw new ValidationError('삭제할 근무지를 찾을 수 없습니다.');
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function saveStores(auth, stores) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const existingResult = await client.query('select id, name, address, phone, memo, is_active, color, sort_order from public.stores where id = any($1::text[])', [stores.map((store) => store.id)]);
    const existingById = new Map(existingResult.rows.map((row) => [row.id, row]));
    const existingIds = new Set(existingById.keys());
    if (stores.some((store) => !existingIds.has(store.id)) && !hasPermission(auth.permissions, 'settings', 'create')) {
      throw new PermissionError('추가 권한이 없습니다.');
    }
    const hasUpdates = stores.some((store, index) => {
      const existing = existingById.get(store.id);
      return existing && (
        existing.name !== store.name ||
        existing.address !== store.address ||
        existing.phone !== store.phone ||
        existing.memo !== store.memo ||
        existing.is_active !== store.isActive ||
        existing.color !== store.color ||
        existing.sort_order !== index + 1
      );
    });
    if (hasUpdates && !hasPermission(auth.permissions, 'settings', 'update')) {
      throw new PermissionError('수정 권한이 없습니다.');
    }

    for (const [index, store] of stores.entries()) {
      await client.query(
        `
          insert into public.stores (id, name, address, phone, memo, is_active, color, sort_order)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (id) do update set
            name = excluded.name,
            address = excluded.address,
            phone = excluded.phone,
            memo = excluded.memo,
            is_active = excluded.is_active,
            color = excluded.color,
            sort_order = excluded.sort_order
        `,
        [store.id, store.name, store.address, store.phone, store.memo, store.isActive, store.color, index + 1],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function normalizeStores(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) {
    throw new ValidationError('근무지 데이터 형식이 올바르지 않습니다.');
  }
  const stores = value.map((store) => ({
    id: assertId(store?.id),
    name: assertText(store?.name, '근무지 이름', 80),
    address: assertText(store?.address ?? '', '주소', 200, false),
    phone: assertText(store?.phone ?? '', '연락처', 40, false),
    memo: assertText(store?.memo ?? '', '메모', 500, false),
    isActive: store?.isActive !== false,
    color: assertColor(store?.color ?? 'purple'),
  }));
  if (new Set(stores.map((store) => store.id)).size !== stores.length) {
    throw new ValidationError('중복된 근무지 ID가 있습니다.');
  }
  return stores;
}

function assertId(value) {
  const id = String(value ?? '');
  if (!ID_PATTERN.test(id)) throw new ValidationError('근무지 ID가 올바르지 않습니다.');
  return id;
}

function assertText(value, label, maxLength, required = true) {
  const text = String(value ?? '').trim();
  if ((required && !text) || text.length > maxLength) throw new ValidationError(`${label} 값이 올바르지 않습니다.`);
  return text;
}

function assertColor(value) {
  const color = String(value ?? '');
  if (!HEX_COLOR_PATTERN.test(color) && !COLOR_TOKEN_PATTERN.test(color)) throw new ValidationError('표시 색상이 올바르지 않습니다.');
  return color;
}

class ValidationError extends Error {}
class PermissionError extends Error {}
