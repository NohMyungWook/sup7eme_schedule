import { minutesWithinMonth } from '../../shared/schedule.js';
import {
  ApiError,
  getPool,
  isManagerRole,
  requireAuth,
  requireMethod,
  sendApiError,
  sendJson,
} from './_db.js';
import { assertMonth, normalizeDbTime, queryParams, toDateString } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET'])) return;

  try {
    const auth = await requireAuth(request, response, null, { allowPasswordChangeRequired: true });
    if (!auth) return;
    if (isManagerRole(auth.role)) throw new ApiError(403, '직원 계정 전용 기능입니다.');
    if (!auth.employeeId) throw new ApiError(403, '연결된 직원 프로필이 없습니다.');
    const resource = queryParams(request).get('resource') || 'profile';

    if (auth.mustChangePassword && resource !== 'profile') {
      throw new ApiError(403, '임시 비밀번호를 먼저 변경해주세요.', 'PASSWORD_CHANGE_REQUIRED');
    }

    if (resource === 'profile') {
      sendJson(response, 200, { profile: await fetchProfile(auth) });
      return;
    }
    if (resource === 'hours') {
      const month = assertMonth(queryParams(request).get('month'));
      sendJson(response, 200, { summary: await fetchMonthlyHours(auth.employeeId, month) });
      return;
    }
    throw new ApiError(400, '지원하지 않는 내 정보 조회입니다.');
  } catch (error) {
    sendApiError(response, error, '내 정보를 불러오지 못했습니다.');
  }
}

async function fetchProfile(auth) {
  const result = await getPool().query(
    `
      select employee.id, employee.name, employee.color, employee.employment_status,
        employee.created_at, employee.updated_at,
        coalesce(jsonb_agg(jsonb_build_object(
          'id', store.id, 'name', store.name, 'color', store.color
        ) order by store.sort_order) filter (where store.id is not null), '[]'::jsonb) as stores
      from public.employees employee
      left join public.employee_stores employee_store on employee_store.employee_id = employee.id
      left join public.stores store on store.id = employee_store.store_id
      where employee.id = $1
      group by employee.id
    `,
    [auth.employeeId],
  );
  const employee = result.rows[0];
  if (!employee) throw new ApiError(404, '직원 프로필을 찾을 수 없습니다.');
  return {
    id: employee.id,
    name: employee.name,
    color: employee.color,
    employmentStatus: employee.employment_status,
    username: auth.username,
    mustChangePassword: auth.mustChangePassword,
    stores: employee.stores,
    createdAt: employee.created_at?.toISOString?.() ?? employee.created_at,
    updatedAt: employee.updated_at?.toISOString?.() ?? employee.updated_at,
  };
}

async function fetchMonthlyHours(employeeId, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
  const result = await getPool().query(
    `
      select shift.id, shift.work_date, shift.start_time, shift.end_time,
        shift.store_id, store.name as store_name
      from public.shifts shift
      join public.stores store on store.id = shift.store_id
      where shift.employee_id = $1 and shift.status = 'scheduled'
        and shift.work_date between $2::date - 1 and $3::date
      order by shift.work_date, shift.start_time
    `,
    [employeeId, startDate, nextMonth],
  );

  const byStore = new Map();
  const byWeek = new Map();
  const days = [];
  let totalMinutes = 0;
  for (const row of result.rows) {
    const date = toDateString(row.work_date);
    const startTime = normalizeDbTime(row.start_time);
    const endTime = normalizeDbTime(row.end_time);
    const minutes = minutesWithinMonth(date, startTime, endTime, month);
    if (!minutes) continue;
    totalMinutes += minutes;
    days.push({ id: row.id, date, storeId: row.store_id, storeName: row.store_name, startTime, endTime, minutes });
    const store = byStore.get(row.store_id) ?? { storeId: row.store_id, storeName: row.store_name, minutes: 0 };
    store.minutes += minutes;
    byStore.set(row.store_id, store);
    const week = weekOfMonth(date);
    byWeek.set(week, (byWeek.get(week) ?? 0) + minutes);
  }
  return {
    month,
    totalMinutes,
    workDays: new Set(days.map((day) => day.date)).size,
    days,
    byStore: [...byStore.values()],
    byWeek: [...byWeek.entries()].map(([week, minutes]) => ({ week, minutes })),
  };
}

function weekOfMonth(date) {
  const day = Number(date.slice(8, 10));
  const firstWeekday = new Date(`${date.slice(0, 7)}-01T12:00:00+09:00`).getDay();
  return Math.floor((firstWeekday + day - 1) / 7) + 1;
}
