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
} from './_db.js';
import { assertDate, assertDateRange, assertId, assertText, queryParams, toDateString } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    const action = request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : request.method === 'DELETE' ? 'delete' : 'update';
    assertPermission(auth, 'notes', action);

    if (request.method === 'GET') {
      const params = queryParams(request);
      const storeId = params.get('storeId');
      if (storeId) assertStoreAccess(auth, assertId(storeId, '근무지 ID'));
      const startDate = params.get('startDate');
      const endDate = params.get('endDate');
      const range = startDate || endDate ? assertDateRange(startDate, endDate, 370) : null;
      const result = await getPool().query(
        `select note.id, note.store_id, store.name as store_name, note.note_date,
           note.text, note.visible_to_employees, note.created_at, note.updated_at
         from public.day_notes note
         join public.stores store on store.id = note.store_id
         where ($1::text is null or note.store_id = $1)
           and ($2::date is null or note.note_date >= $2)
           and ($3::date is null or note.note_date <= $3)
           and ($4::boolean or note.store_id = any($5::text[]))
         order by note.note_date desc, store.sort_order`,
        [storeId, range?.startDate ?? null, range?.endDate ?? null, isSuperAdmin(auth), auth.storeIds],
      );
      sendJson(response, 200, { notes: result.rows.map(mapNote) });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'DELETE') {
      const storeId = assertId(body.storeId, '근무지 ID');
      const date = assertDate(body.date, '메모 날짜');
      assertStoreAccess(auth, storeId);
      const result = await getPool().query(
        'delete from public.day_notes where store_id = $1 and note_date = $2 returning id',
        [storeId, date],
      );
      if (!result.rows[0]) throw new ApiError(404, '메모를 찾을 수 없습니다.');
      sendJson(response, 200, { storeId, date });
      return;
    }

    const note = normalizeNote(body.note);
    assertStoreAccess(auth, note.storeId);
    const result = await getPool().query(
      `
        insert into public.day_notes (
          id, store_id, note_date, text, visible_to_employees,
          created_by_account, updated_by_account
        ) values ($1, $2, $3, $4, $5, $6, $6)
        on conflict (store_id, note_date) do update
        set text = excluded.text,
            visible_to_employees = excluded.visible_to_employees,
            updated_by_account = excluded.updated_by_account
        returning id, store_id, note_date, text, visible_to_employees, created_at, updated_at
      `,
      [note.id, note.storeId, note.date, note.text, note.visibleToEmployees, auth.id],
    );
    sendJson(response, request.method === 'POST' ? 201 : 200, { note: mapNote(result.rows[0]) });
  } catch (error) {
    sendApiError(response, error, '메모를 처리하지 못했습니다.');
  }
}

function normalizeNote(note) {
  if (!note || typeof note !== 'object') throw new ApiError(400, '메모 데이터 형식이 올바르지 않습니다.');
  const storeId = assertId(note.storeId, '근무지 ID');
  const date = assertDate(note.date, '메모 날짜');
  return {
    id: note.id ? assertId(note.id, '메모 ID') : `${storeId}-${date}-${crypto.randomUUID()}`.slice(0, 100),
    storeId,
    date,
    text: assertText(note.text, '메모 내용', 1000),
    visibleToEmployees: note.visibleToEmployees !== false,
  };
}

function mapNote(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.store_name,
    date: toDateString(row.note_date),
    text: row.text,
    visibleToEmployees: Boolean(row.visible_to_employees),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
