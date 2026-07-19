import {
  assertManager,
  getPool,
  isSuperAdmin,
  requireAuth,
  requireMethod,
  sendApiError,
  sendJson,
} from './_db.js';
import { normalizeDbTime, toDateString } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;
  try {
    const auth = await requireAuth(request, response, { menu: 'schedule', action: 'view' });
    if (!auth) return;
    assertManager(auth);
    sendJson(response, 200, { state: await fetchAdminReferenceState(auth) });
  } catch (error) {
    sendApiError(response, error, '스케줄 기준 정보를 불러오지 못했습니다.');
  }
}

async function fetchAdminReferenceState(auth) {
  const pool = getPool();
  const allStores = isSuperAdmin(auth);
  // Transaction Pooler 공유 연결에서는 모든 DB 요청을 순차 실행한다.
  const storesResult = await pool.query(
    `select id, name, address, phone, memo, is_active, color, created_at, updated_at
     from public.stores
     where $1::boolean or id = any($2::text[])
     order by sort_order, name`,
    [allStores, auth.storeIds],
  );
  const scopedStoreIds = storesResult.rows.map((store) => store.id);
  const employeesResult = await pool.query(
    `select employee.id, employee.name, employee.memo, employee.color,
       employee.is_active, employee.employment_status, employee.created_at, employee.updated_at,
       user_account.id as account_id, user_account.username, user_account.status as account_status,
       coalesce((
         select array_agg(employee_store.store_id order by store.sort_order, store.name)
         from public.employee_stores employee_store
         join public.stores store on store.id = employee_store.store_id
         where employee_store.employee_id = employee.id
           and employee_store.store_id = any($2::text[])
       ), '{}') as store_ids,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', base_shift.id, 'storeId', base_shift.store_id,
           'weekday', base_shift.weekday, 'templateId', base_shift.template_id,
           'startTime', base_shift.start_time, 'endTime', base_shift.end_time
         ) order by base_shift.store_id, base_shift.weekday, base_shift.start_time)
         from public.employee_base_shifts base_shift
         where base_shift.employee_id = employee.id
           and base_shift.store_id = any($2::text[])
       ), '[]'::jsonb) as base_shifts
     from public.employees employee
     left join public.app_users user_account on user_account.employee_id = employee.id
     where ($1::boolean or exists (
       select 1 from public.employee_stores employee_store
       where employee_store.employee_id = employee.id and employee_store.store_id = any($2::text[])
     ))
     order by employee.sort_order, employee.created_at`,
    [allStores, scopedStoreIds],
  );
  const templatesResult = await pool.query(
    `select template.id, template.label, template.default_start_time, template.default_end_time,
       template.color, template.requires_time_input, template.is_active,
       template.created_at, template.updated_at,
       (select count(*)::int from public.employee_base_shifts base_shift where base_shift.template_id = template.id) as base_shift_count,
       (select count(*)::int from public.shifts shift where shift.template_id = template.id) as schedule_count
     from public.shift_templates template where template.is_active = true order by template.sort_order`,
  );
  const notesResult = await pool.query(
    `select store_id, note_date, text from public.day_notes
     where store_id = any($1::text[]) order by note_date desc limit 3000`,
    [scopedStoreIds],
  );

  return {
    stores: storesResult.rows.map((store) => ({
      id: store.id, name: store.name, address: store.address, phone: store.phone,
      memo: store.memo, isActive: store.is_active, color: store.color,
      createdAt: store.created_at?.toISOString?.() ?? store.created_at,
      updatedAt: store.updated_at?.toISOString?.() ?? store.updated_at,
    })),
    employees: employeesResult.rows.map((employee) => ({
      id: employee.id,
      name: employee.name,
      preference: employee.memo,
      color: employee.color,
      isActive: employee.is_active,
      employmentStatus: employee.employment_status,
      accountId: employee.account_id,
      username: employee.username,
      accountStatus: employee.account_status,
      createdAt: employee.created_at?.toISOString?.() ?? employee.created_at,
      updatedAt: employee.updated_at?.toISOString?.() ?? employee.updated_at,
      storeIds: employee.store_ids ?? [],
      baseShifts: (employee.base_shifts ?? []).map((row) => ({
        id: row.id, storeId: row.storeId, weekday: Number(row.weekday), templateId: row.templateId,
        startTime: normalizeDbTime(row.startTime), endTime: normalizeDbTime(row.endTime),
      })),
    })),
    templates: templatesResult.rows.map((template) => {
      const startTime = normalizeDbTime(template.default_start_time);
      const endTime = normalizeDbTime(template.default_end_time);
      return {
        id: template.id,
        label: template.label,
        time: startTime && endTime ? `${startTime}-${endTime}` : '00:00-00:00',
        color: template.color,
        requiresTimeInput: template.requires_time_input,
        isActive: template.is_active,
        baseShiftCount: Number(template.base_shift_count ?? 0),
        scheduleCount: Number(template.schedule_count ?? 0),
        createdAt: template.created_at?.toISOString?.() ?? template.created_at,
        updatedAt: template.updated_at?.toISOString?.() ?? template.updated_at,
      };
    }),
    shifts: [],
    notes: notesResult.rows.map((note) => ({ storeId: note.store_id, date: toDateString(note.note_date), text: note.text })),
  };
}
