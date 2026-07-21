import crypto from 'node:crypto';
import { addDateDays, leaveDateRangeConflictsShift, shiftsOverlap } from '../shared/schedule.js';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  withTransaction,
} from './_db.js';
import { assertDate, assertId, normalizeDbTime, toDateString } from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertManager(auth);
    assertPermission(auth, 'schedule', 'create');
    const body = await readJsonBody(request);
    const storeId = assertId(body.storeId, '근무지 ID');
    const weekStart = assertDate(body.weekStart, '대상 주 시작일');
    assertStoreAccess(auth, storeId);
    const result = body.action === 'copy-previous-week'
      ? await copyPreviousWeek(auth, storeId, weekStart, Boolean(body.overwrite))
      : body.action === 'generate-base-week'
        ? await generateBaseWeek(auth, storeId, weekStart)
        : null;
    if (!result) throw new ApiError(400, '지원하지 않는 스케줄 생성 작업입니다.');
    sendJson(response, 200, result);
  } catch (error) {
    sendApiError(response, error, '주간 스케줄을 생성하지 못했습니다.');
  }
}

async function copyPreviousWeek(auth, storeId, weekStart, overwrite) {
  const sourceStart = addDateDays(weekStart, -7);
  const sourceEnd = addDateDays(weekStart, -1);
  const targetEnd = addDateDays(weekStart, 6);

  return withTransaction(async (client) => {
    const store = await client.query('select is_active from public.stores where id = $1 for update', [storeId]);
    if (!store.rows[0]) throw new ApiError(404, '근무지를 찾을 수 없습니다.');
    if (!store.rows[0].is_active) throw new ApiError(409, '운영 중지된 근무지에는 스케줄을 생성할 수 없습니다.');
    const existing = await client.query(
      `select id, employee_id, work_date, start_time, end_time
       from public.shifts
       where store_id = $1 and status = 'scheduled' and work_date between $2 and $3
       for update`,
      [storeId, weekStart, targetEnd],
    );
    if (existing.rows.length && !overwrite) {
      throw new ApiError(409, '대상 주에 이미 근무가 있습니다. 덮어쓰기를 확인해주세요.', 'TARGET_WEEK_NOT_EMPTY');
    }
    const source = await client.query(
      `select shift.employee_id, shift.template_id, shift.work_date,
         shift.start_time, shift.end_time, shift.note
       from public.shifts shift
       join public.employees employee on employee.id = shift.employee_id
       join public.employee_stores employee_store
         on employee_store.employee_id = employee.id and employee_store.store_id = shift.store_id
       where shift.store_id = $1 and shift.status = 'scheduled'
         and shift.work_date between $2 and $3
         and employee.is_active = true and employee.employment_status = 'active'
       order by shift.work_date, shift.start_time`,
      [storeId, sourceStart, sourceEnd],
    );
    if (!source.rows.length) throw new ApiError(409, '복사할 지난주 근무가 없습니다.');
    const leaves = await fetchWeekLeaves(client, storeId, weekStart, targetEnd);

    const prepared = [];
    const conflicts = [];
    for (const row of source.rows) {
      const targetDate = addDateDays(toDateString(row.work_date), 7);
      const candidate = {
        id: crypto.randomUUID(),
        employeeId: row.employee_id,
        templateId: row.template_id,
        date: targetDate,
        startTime: normalizeDbTime(row.start_time),
        endTime: normalizeDbTime(row.end_time),
        note: row.note ?? '',
      };
      const leave = findLeaveConflict(leaves, candidate);
      if (leave?.status === 'approved') {
        conflicts.push({ employeeId: candidate.employeeId, date: candidate.date, type: 'approved-leave' });
        continue;
      }
      if (leave) conflicts.push({ employeeId: candidate.employeeId, date: candidate.date, type: 'pending-leave' });
      prepared.push(candidate);
    }

    if (overwrite && existing.rows.length) {
      await client.query(
        `update public.shifts set status = 'cancelled', cancelled_at = now(),
           cancelled_by_account = $4, updated_by_account = $4
         where store_id = $1 and status = 'scheduled' and work_date between $2 and $3`,
        [storeId, weekStart, targetEnd, auth.id],
      );
    }
    await insertGeneratedShifts(client, auth.id, storeId, prepared, 'previous_week');
    return { created: prepared.length, skipped: source.rows.length - prepared.length, conflicts };
  });
}

async function generateBaseWeek(auth, storeId, weekStart) {
  const targetEnd = addDateDays(weekStart, 6);
  return withTransaction(async (client) => {
    const store = await client.query('select is_active from public.stores where id = $1 for update', [storeId]);
    if (!store.rows[0]) throw new ApiError(404, '근무지를 찾을 수 없습니다.');
    if (!store.rows[0].is_active) throw new ApiError(409, '운영 중지된 근무지에는 스케줄을 생성할 수 없습니다.');
    const rules = await client.query(
      `select base_shift.employee_id, base_shift.weekday, base_shift.template_id,
         base_shift.start_time, base_shift.end_time
       from public.employee_base_shifts base_shift
       join public.employees employee on employee.id = base_shift.employee_id
       join public.employee_stores employee_store
         on employee_store.employee_id = employee.id and employee_store.store_id = base_shift.store_id
       left join public.shift_templates template on template.id = base_shift.template_id
       where base_shift.store_id = $1
         and employee.is_active = true and employee.employment_status = 'active'
         and (template.id is null or template.is_active = true)
       order by base_shift.weekday, base_shift.start_time`,
      [storeId],
    );
    if (!rules.rows.length) throw new ApiError(409, '등록된 기본 근무가 없습니다.');
    const existing = await client.query(
      `select employee_id, work_date, start_time, end_time
       from public.shifts
       where status = 'scheduled'
         and work_date between $1::date - 1 and $2::date + 1`,
      [weekStart, targetEnd],
    );
    const leaves = await fetchWeekLeaves(client, storeId, weekStart, targetEnd);
    const prepared = [];
    const conflicts = [];
    let skipped = 0;

    for (const rule of rules.rows) {
      const date = addDateDays(weekStart, Number(rule.weekday));
      const candidate = {
        id: crypto.randomUUID(),
        employeeId: rule.employee_id,
        templateId: rule.template_id,
        date,
        startTime: normalizeDbTime(rule.start_time),
        endTime: normalizeDbTime(rule.end_time),
        note: '',
      };
      const alreadyOverlaps = [...existing.rows, ...prepared].some((shift) =>
        (shift.employee_id ?? shift.employeeId) === candidate.employeeId
        && shiftsOverlap(
          { date: candidate.date, startTime: candidate.startTime, endTime: candidate.endTime },
          {
            date: toDateString(shift.work_date ?? shift.date),
            startTime: normalizeDbTime(shift.start_time ?? shift.startTime),
            endTime: normalizeDbTime(shift.end_time ?? shift.endTime),
          },
        ));
      if (alreadyOverlaps) {
        skipped += 1;
        conflicts.push({ employeeId: candidate.employeeId, date, type: 'existing-shift' });
        continue;
      }
      const leave = findLeaveConflict(leaves, candidate);
      if (leave?.status === 'approved') {
        skipped += 1;
        conflicts.push({ employeeId: candidate.employeeId, date, type: 'approved-leave' });
        continue;
      }
      if (leave) conflicts.push({ employeeId: candidate.employeeId, date, type: 'pending-leave' });
      prepared.push(candidate);
    }

    await insertGeneratedShifts(client, auth.id, storeId, prepared, 'base_week');
    return { created: prepared.length, skipped, conflicts };
  });
}

async function fetchWeekLeaves(client, storeId, startDate, endDate) {
  const result = await client.query(
    `select employee_id, target_date, end_date, all_day, start_time, end_time, status
     from public.leave_requests
     where store_id = $1 and status in ('pending', 'approved')
       and target_date <= $3::date + 1
       and end_date >= $2::date - 1`,
    [storeId, startDate, endDate],
  );
  return result.rows;
}

function findLeaveConflict(leaves, candidate) {
  return leaves.find((leave) => {
    if (leave.employee_id !== candidate.employeeId) return false;
    if (leave.all_day) {
      return leaveDateRangeConflictsShift({
        startDate: toDateString(leave.target_date),
        endDate: toDateString(leave.end_date ?? leave.target_date),
      }, candidate);
    }
    return shiftsOverlap(candidate, {
      date: toDateString(leave.target_date),
      startTime: normalizeDbTime(leave.start_time),
      endTime: normalizeDbTime(leave.end_time),
    });
  });
}

async function insertGeneratedShifts(client, accountId, storeId, shifts, source) {
  if (!shifts.length) return;
  await client.query(
    `
      insert into public.shifts (
        id, store_id, employee_id, template_id, work_date,
        start_time, end_time, note, status, source,
        created_by_account, updated_by_account
      )
      select row.id, $1, row.employee_id, row.template_id, row.work_date,
        row.start_time, row.end_time, row.note, 'scheduled', $2, $3, $3
      from jsonb_to_recordset($4::jsonb) as row(
        id text, employee_id text, template_id text, work_date date,
        start_time text, end_time text, note text
      )
    `,
    [storeId, source, accountId, JSON.stringify(shifts.map((shift) => ({
      id: shift.id,
      employee_id: shift.employeeId,
      template_id: shift.templateId,
      work_date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      note: shift.note,
    })))],
  );
}
