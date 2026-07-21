import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
} from './_db.js';
import { assertId, assertOptionalId, assertTime, normalizeDbTime, queryParams } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;
  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    const action = request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : request.method === 'DELETE' ? 'delete' : 'update';
    assertPermission(auth, 'settings', action);
    if (request.method === 'GET') {
      const storeId = queryParams(request).get('storeId');
      if (storeId) assertStoreAccess(auth, assertId(storeId, '근무지 ID'));
      const result = await getPool().query(
        `select rule.id, rule.store_id, store.name as store_name, rule.weekday,
           rule.template_id, template.label as template_label,
           rule.start_time, rule.end_time, rule.minimum_staff,
           rule.is_active, rule.created_at, rule.updated_at
         from public.schedule_rules rule
         join public.stores store on store.id = rule.store_id
         left join public.shift_templates template on template.id = rule.template_id
         where rule.is_active = true
           and ($1::text is null or rule.store_id = $1)
           and rule.store_id = any($2::text[])
         order by store.sort_order, rule.weekday, rule.start_time`,
        [storeId, auth.storeIds],
      );
      sendJson(response, 200, { rules: result.rows.map(mapRule) });
      return;
    }
    const body = await readJsonBody(request);
    if (request.method === 'DELETE') {
      const ruleId = assertId(body.ruleId, '규칙 ID');
      const current = await getPool().query('select store_id from public.schedule_rules where id = $1 and is_active = true', [ruleId]);
      if (!current.rows[0]) throw new ApiError(404, '스케줄 규칙을 찾을 수 없습니다.');
      assertStoreAccess(auth, current.rows[0].store_id);
      await getPool().query('update public.schedule_rules set is_active = false where id = $1', [ruleId]);
      sendJson(response, 200, { ruleId, status: 'inactive' });
      return;
    }
    const rule = normalizeRule(body.rule, request.method === 'PUT');
    let currentStoreId = null;
    if (request.method === 'PUT') {
      const current = await getPool().query(
        'select store_id from public.schedule_rules where id = $1 and is_active = true',
        [rule.id],
      );
      if (!current.rows[0]) throw new ApiError(404, '스케줄 규칙을 찾을 수 없습니다.');
      // 새 매장 권한만 검사하면 타 매장 규칙 ID를 자기 매장으로 이동시킬 수 있으므로 원본도 확인한다.
      assertStoreAccess(auth, current.rows[0].store_id);
      currentStoreId = current.rows[0].store_id;
    }
    assertStoreAccess(auth, rule.storeId);
    const store = await getPool().query('select is_active from public.stores where id = $1', [rule.storeId]);
    if (!store.rows[0]?.is_active) throw new ApiError(409, '운영 중인 근무지에만 규칙을 등록할 수 있습니다.');
    if (rule.templateId) {
      const template = await getPool().query('select id from public.shift_templates where id = $1 and is_active = true', [rule.templateId]);
      if (!template.rows[0]) throw new ApiError(409, '활성 시간대를 찾을 수 없습니다.');
    }
    const result = request.method === 'POST'
      ? await getPool().query(
        `insert into public.schedule_rules (store_id, weekday, template_id, start_time, end_time, minimum_staff, is_active)
         values ($1, $2, $3, $4, $5, $6, true)
         on conflict (store_id, weekday, start_time, end_time) do update
         set template_id = excluded.template_id, minimum_staff = excluded.minimum_staff, is_active = true
         returning *`,
        [rule.storeId, rule.weekday, rule.templateId, rule.startTime, rule.endTime, rule.minimumStaff],
      )
      : await getPool().query(
        `update public.schedule_rules set store_id = $2, weekday = $3, template_id = $4,
           start_time = $5, end_time = $6, minimum_staff = $7, is_active = true
         where id = $1 and store_id = $8 returning *`,
        [rule.id, rule.storeId, rule.weekday, rule.templateId, rule.startTime, rule.endTime, rule.minimumStaff, currentStoreId],
      );
    if (!result.rows[0]) throw new ApiError(404, '스케줄 규칙을 찾을 수 없습니다.');
    sendJson(response, request.method === 'POST' ? 201 : 200, { rule: mapRule(result.rows[0]) });
  } catch (error) {
    sendApiError(response, error, '스케줄 규칙을 처리하지 못했습니다.');
  }
}

function normalizeRule(input, requireId) {
  if (!input || typeof input !== 'object') throw new ApiError(400, '스케줄 규칙 형식이 올바르지 않습니다.');
  const weekday = Number(input.weekday);
  const minimumStaff = Number(input.minimumStaff);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new ApiError(400, '요일이 올바르지 않습니다.');
  if (!Number.isInteger(minimumStaff) || minimumStaff < 1 || minimumStaff > 100) throw new ApiError(400, '최소 필요 인원은 1~100명으로 입력해주세요.');
  return {
    id: requireId ? assertId(input.id, '규칙 ID') : null,
    storeId: assertId(input.storeId, '근무지 ID'),
    weekday,
    templateId: assertOptionalId(input.templateId, '시간대 ID'),
    startTime: assertTime(input.startTime, '시작 시간', false),
    endTime: assertTime(input.endTime, '종료 시간', true),
    minimumStaff,
  };
}

function mapRule(row) {
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.store_name,
    weekday: Number(row.weekday),
    templateId: row.template_id,
    templateLabel: row.template_label,
    startTime: normalizeDbTime(row.start_time),
    endTime: normalizeDbTime(row.end_time),
    minimumStaff: Number(row.minimum_staff),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
