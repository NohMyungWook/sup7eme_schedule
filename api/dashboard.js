import { addDateDays, minutesWithinMonth, shiftsOverlap } from '../shared/schedule.js';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  isSuperAdmin,
  requireAuth,
  requireMethod,
  sendApiError,
  sendJson,
} from './_db.js';
import { assertId, assertMonth, normalizeDbTime, queryParams, toDateString } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    assertPermission(auth, 'dashboard', 'view');
    const params = queryParams(request);
    const storeId = assertId(params.get('storeId'), '근무지 ID');
    const month = assertMonth(params.get('month'));
    assertStoreAccess(auth, storeId);
    sendJson(response, 200, { dashboard: await buildDashboard(auth, storeId, month) });
  } catch (error) {
    sendApiError(response, error, '대시보드를 불러오지 못했습니다.');
  }
}

async function buildDashboard(auth, storeId, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const nextMonth = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
  const endDate = addDateDays(nextMonth, -1);
  const pool = getPool();
  const shiftsResult = await pool.query(
    `
      select shift.id, shift.employee_id, employee.name as employee_name,
        shift.work_date, shift.start_time, shift.end_time
      from public.shifts shift
      join public.employees employee on employee.id = shift.employee_id
      where shift.store_id = $1 and shift.status = 'scheduled'
        and shift.work_date between $2::date - 1 and $3::date
      order by shift.work_date, shift.start_time
    `,
    [storeId, startDate, endDate],
  );
  const rulesResult = await pool.query(
    `select id, weekday, start_time, end_time, minimum_staff
     from public.schedule_rules
     where store_id = $1 and is_active = true
     order by weekday, start_time`,
    [storeId],
  );
  const storeHoursResult = await pool.query(
    `select shift.store_id, store.name as store_name,
       shift.work_date, shift.start_time, shift.end_time
     from public.shifts shift
     join public.stores store on store.id = shift.store_id
     where shift.status = 'scheduled'
       and shift.work_date between $1::date - 1 and $2::date
       and ($3::boolean or shift.store_id = any($4::text[]))
     order by store.sort_order, shift.work_date, shift.start_time`,
    [startDate, endDate, isSuperAdmin(auth), auth.storeIds],
  );

  const shifts = shiftsResult.rows.map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    date: toDateString(row.work_date),
    startTime: normalizeDbTime(row.start_time),
    endTime: normalizeDbTime(row.end_time),
  }));
  const employeeMinutes = new Map();
  const storeMinutes = new Map();
  let totalMinutes = 0;
  for (const shift of shifts) {
    const minutes = minutesWithinMonth(shift.date, shift.startTime, shift.endTime, month);
    if (!minutes) continue;
    totalMinutes += minutes;
    const item = employeeMinutes.get(shift.employeeId) ?? { employeeId: shift.employeeId, employeeName: shift.employeeName, minutes: 0 };
    item.minutes += minutes;
    employeeMinutes.set(shift.employeeId, item);
  }

  for (const row of storeHoursResult.rows) {
    const minutes = minutesWithinMonth(
      toDateString(row.work_date),
      normalizeDbTime(row.start_time),
      normalizeDbTime(row.end_time),
      month,
    );
    if (!minutes) continue;
    const item = storeMinutes.get(row.store_id) ?? {
      storeId: row.store_id,
      storeName: row.store_name,
      minutes: 0,
    };
    item.minutes += minutes;
    storeMinutes.set(row.store_id, item);
  }

  const gaps = [];
  for (let date = startDate; date <= endDate; date = addDateDays(date, 1)) {
    const weekday = new Date(`${date}T12:00:00+09:00`).getDay();
    for (const rule of rulesResult.rows.filter((item) => Number(item.weekday) === weekday)) {
      const assigned = new Set(shifts.filter((shift) => shiftsOverlap(
        { date, startTime: normalizeDbTime(rule.start_time), endTime: normalizeDbTime(rule.end_time) },
        shift,
      )).map((shift) => shift.employeeId)).size;
      if (assigned < Number(rule.minimum_staff)) {
        gaps.push({
          date,
          startTime: normalizeDbTime(rule.start_time),
          endTime: normalizeDbTime(rule.end_time),
          required: Number(rule.minimum_staff),
          assigned,
        });
      }
    }
  }

  return {
    storeId,
    month,
    registeredShifts: shifts.filter((shift) => shift.date.startsWith(month)).length,
    totalMinutes,
    participatingEmployees: employeeMinutes.size,
    employeeHours: [...employeeMinutes.values()].sort((left, right) => right.minutes - left.minutes),
    storeHours: [...storeMinutes.values()],
    gaps,
    hasCoverageRules: rulesResult.rows.length > 0,
  };
}
