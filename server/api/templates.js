import crypto from 'node:crypto';
import {
  ApiError,
  assertManager,
  assertPermission,
  getPool,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
} from './_db.js';
import { assertColor, assertId, assertText, assertTime, normalizeDbTime, queryParams } from './_validation.js';

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
      sendJson(response, 200, { templates: await fetchTemplates(queryParams(request).get('includeInactive') === 'true') });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'DELETE') {
      const templateId = assertId(body.templateId, '시간대 ID');
      const activeCount = await getPool().query('select count(*)::int as count from public.shift_templates where is_active = true');
      if (activeCount.rows[0].count <= 1) throw new ApiError(409, '마지막 활성 시간대는 비활성화할 수 없습니다.');
      const result = await getPool().query(
        `update public.shift_templates set is_active = false where id = $1 and is_active = true returning id`,
        [templateId],
      );
      if (!result.rows[0]) throw new ApiError(404, '활성 시간대를 찾을 수 없습니다.');
      sendJson(response, 200, { templateId, status: 'inactive' });
      return;
    }

    const template = normalizeTemplate({
      ...body.template,
      id: body.template?.id || crypto.randomUUID(),
    });
    const duplicate = await getPool().query(
      `select id from public.shift_templates where lower(label) = lower($1) and id <> $2 and is_active = true limit 1`,
      [template.label, template.id],
    );
    if (duplicate.rows[0]) throw new ApiError(409, '같은 이름의 활성 시간대가 이미 있습니다.');

    const result = await getPool().query(
      `
        insert into public.shift_templates (
          id, label, default_start_time, default_end_time, color,
          requires_time_input, is_active, sort_order
        )
        values (
          $1, $2, $3, $4, $5, $6, true,
          coalesce((select max(sort_order) + 1 from public.shift_templates), 1)
        )
        on conflict (id) do update
        set label = excluded.label,
            default_start_time = excluded.default_start_time,
            default_end_time = excluded.default_end_time,
            color = excluded.color,
            requires_time_input = excluded.requires_time_input,
            is_active = true
        returning id, label, default_start_time, default_end_time, color,
          requires_time_input, is_active, created_at, updated_at
      `,
      [
        template.id,
        template.label,
        template.requiresTimeInput ? null : template.startTime,
        template.requiresTimeInput ? null : template.endTime,
        template.color,
        template.requiresTimeInput,
      ],
    );
    sendJson(response, request.method === 'POST' ? 201 : 200, { template: mapTemplate(result.rows[0]) });
  } catch (error) {
    sendApiError(response, error, '시간대 정보를 처리하지 못했습니다.');
  }
}

async function fetchTemplates(includeInactive) {
  const result = await getPool().query(
    `select template.id, template.label, template.default_start_time, template.default_end_time,
       template.color, template.requires_time_input, template.is_active,
       template.created_at, template.updated_at,
       (select count(*)::int from public.employee_base_shifts base_shift where base_shift.template_id = template.id) as base_shift_count,
       (select count(*)::int from public.shifts shift where shift.template_id = template.id) as schedule_count
     from public.shift_templates template
     where $1::boolean or template.is_active = true
     order by template.sort_order, template.created_at`,
    [includeInactive],
  );
  return result.rows.map(mapTemplate);
}

function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') throw new ApiError(400, '시간대 데이터 형식이 올바르지 않습니다.');
  const requiresTimeInput = Boolean(template.requiresTimeInput);
  return {
    id: assertId(template.id, '시간대 ID'),
    label: assertText(template.label, '시간대 이름', 80),
    startTime: requiresTimeInput ? '00:00' : assertTime(template.startTime, '시작 시간', false),
    endTime: requiresTimeInput ? '00:00' : assertTime(template.endTime, '종료 시간', true),
    color: assertColor(template.color, 'blue'),
    requiresTimeInput,
  };
}

function mapTemplate(row) {
  const startTime = normalizeDbTime(row.default_start_time) ?? '00:00';
  const endTime = normalizeDbTime(row.default_end_time) ?? '00:00';
  return {
    id: row.id,
    label: row.label,
    time: `${startTime}-${endTime}`,
    color: row.color,
    requiresTimeInput: Boolean(row.requires_time_input),
    isActive: Boolean(row.is_active),
    baseShiftCount: Number(row.base_shift_count ?? 0),
    scheduleCount: Number(row.schedule_count ?? 0),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
