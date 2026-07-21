import crypto from 'node:crypto';
import { leaveDateRangeConflictsShift, shiftsOverlap } from '../../shared/schedule.js';
import { canAssignEmployee } from '../../shared/policies.js';
import {
  ApiError,
  assertManager,
  assertPermission,
  assertStoreAccess,
  getPool,
  isManagerRole,
  readJsonBody,
  requireAuth,
  requireMethod,
  requireSameOrigin,
  sendApiError,
  sendJson,
  withTransaction,
} from './_db.js';
import {
  assertDate,
  assertDateRange,
  assertId,
  assertOptionalId,
  assertText,
  assertTime,
  normalizeDbTime,
  queryParams,
  toDateString,
} from './_validation.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'DELETE'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;

    if (request.method === 'GET') {
      assertPermission(auth, 'schedule', 'view');
      const shifts = await fetchShifts(auth, request);
      sendJson(response, 200, { shifts });
      return;
    }

    assertManager(auth);
    const action = request.method === 'POST' ? 'create' : request.method === 'DELETE' ? 'delete' : 'update';
    assertPermission(auth, 'schedule', action);
    const body = await readJsonBody(request);

    if (request.method === 'DELETE') {
      const result = await cancelShift(auth, body);
      sendJson(response, 200, result);
      return;
    }

    const result = await saveShift(auth, body.shift, {
      isUpdate: request.method === 'PUT',
      acknowledgeConflicts: Boolean(body.acknowledgeConflicts),
    });
    sendJson(response, request.method === 'POST' ? 201 : 200, result);
  } catch (error) {
    sendApiError(response, error, '스케줄을 처리하지 못했습니다.');
  }
}

async function fetchShifts(auth, request) {
  const params = queryParams(request);
  const scope = params.get('scope') ?? 'mine';
  if (!['mine', 'team'].includes(scope)) throw new ApiError(400, '스케줄 조회 범위가 올바르지 않습니다.');
  const isTeamView = !isManagerRole(auth.role) && scope === 'team';
  const { startDate, endDate } = assertDateRange(params.get('startDate'), params.get('endDate'), isTeamView ? 14 : 370);
  let storeId = params.get('storeId');
  let employeeId = params.get('employeeId');

  if (isManagerRole(auth.role)) {
    if (!storeId) throw new ApiError(400, '근무지 ID가 필요합니다.');
    storeId = assertId(storeId, '근무지 ID');
    assertStoreAccess(auth, storeId);
    employeeId = employeeId ? assertId(employeeId, '직원 ID') : null;
  } else {
    if (!auth.employeeId) throw new ApiError(403, '연결된 직원 프로필이 없습니다.');
    employeeId = isTeamView ? null : auth.employeeId;
    storeId = storeId ? assertId(storeId, '근무지 ID') : null;
    if (storeId && !auth.storeIds.includes(storeId)) throw new ApiError(403, '해당 근무지에 접근할 권한이 없습니다.');
  }

  const result = await getPool().query(
    `
      select
        shift.id, shift.store_id, store.name as store_name,
        shift.work_date, shift.employee_id, employee.name as employee_name,
        shift.template_id, template.label as template_label, template.color as template_color,
        shift.start_time, shift.end_time,
        case when $5::boolean then '' else shift.note end as note,
        shift.status,
        shift.source, shift.created_at, shift.updated_at,
        case when $5::boolean then '' else day_note.text end as day_note,
        case when $5::boolean then null else (
          select leave_request.status from public.leave_requests leave_request
          where leave_request.employee_id = shift.employee_id
            and leave_request.status in ('pending', 'approved')
            and (
              shift.work_date between leave_request.target_date and leave_request.end_date
              or (
                shift.end_time <= shift.start_time
                and shift.work_date + 1 between leave_request.target_date and leave_request.end_date
              )
            )
          order by case leave_request.status when 'approved' then 0 else 1 end
          limit 1
        ) end as leave_conflict_status
      from public.shifts shift
      join public.stores store on store.id = shift.store_id
      join public.employees employee on employee.id = shift.employee_id
      left join public.shift_templates template on template.id = shift.template_id
      left join public.day_notes day_note
        on day_note.store_id = shift.store_id
       and day_note.note_date = shift.work_date
       and day_note.visible_to_employees = true
      where shift.work_date between $1 and $2
        and ($3::text is null or shift.store_id = $3)
        and ($4::text is null or shift.employee_id = $4)
        and ($5::boolean = false or shift.store_id = any($6::text[]))
        and shift.status = 'scheduled'
      order by shift.work_date, shift.start_time, employee.sort_order
    `,
    [startDate, endDate, storeId, employeeId, isTeamView, auth.storeIds],
  );
  return result.rows.map(mapShift);
}

async function saveShift(auth, input, options) {
  const shift = normalizeShift(input, options.isUpdate);
  assertStoreAccess(auth, shift.storeId);
  return withTransaction(async (client) => {
  if (options.isUpdate) {
    const currentShift = await client.query(
      `select store_id from public.shifts where id = $1 and status = 'scheduled' for update`,
      [shift.id],
    );
    if (!currentShift.rows[0]) throw new ApiError(404, '수정할 근무를 찾을 수 없습니다.');
    // 대상 매장뿐 아니라 원본 매장에도 접근할 수 있어야 ID 변조로 타 매장 근무를 옮길 수 없다.
    assertStoreAccess(auth, currentShift.rows[0].store_id);
  }
  // 여러 서버리스 인스턴스에서도 같은 직원의 중복 배치 검증과 저장을 직렬화한다.
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [`shift:${shift.employeeId}`]);
  const eligibility = await client.query(
    `
      select
        store.is_active as store_active,
        employee.is_active as employee_active,
        employee.employment_status,
        exists (
          select 1 from public.employee_stores employee_store
          where employee_store.employee_id = employee.id
            and employee_store.store_id = store.id
        ) as can_work_store,
        ($3::text is null or exists (
          select 1 from public.shift_templates template
          where template.id = $3 and template.is_active = true
        )) as template_active
      from public.stores store
      cross join public.employees employee
      where store.id = $1 and employee.id = $2
      limit 1
    `,
    [shift.storeId, shift.employeeId, shift.templateId],
  );
  const eligible = eligibility.rows[0];
  if (!eligible) throw new ApiError(404, '근무지 또는 직원을 찾을 수 없습니다.');
  if (!eligible.store_active) throw new ApiError(409, '운영 중지된 근무지에는 스케줄을 추가할 수 없습니다.');
  if (!eligible.employee_active || eligible.employment_status !== 'active') throw new ApiError(409, '비활성화된 직원에게 스케줄을 추가할 수 없습니다.');
  if (!canAssignEmployee({
    employeeActive: eligible.employee_active,
    employmentStatus: eligible.employment_status,
    storeActive: eligible.store_active,
    canWorkStore: eligible.can_work_store,
  })) throw new ApiError(409, '직원의 근무 가능 매장에 포함되지 않은 근무지입니다.', 'STORE_NOT_ALLOWED');
  if (!eligible.template_active) throw new ApiError(409, '비활성화되었거나 존재하지 않는 시간대입니다.');

  const nearby = await client.query(
    `select id, store_id, work_date, start_time, end_time
     from public.shifts
     where employee_id = $1
       and status = 'scheduled'
       and work_date between $2::date - 1 and $2::date + 1
       and ($3::text is null or id <> $3)`,
    [shift.employeeId, shift.date, shift.id],
  );
  const overlap = nearby.rows.find((row) => shiftsOverlap(
    { date: shift.date, startTime: shift.startTime, endTime: shift.endTime },
    { date: toDateString(row.work_date), startTime: normalizeDbTime(row.start_time), endTime: normalizeDbTime(row.end_time) },
  ));
  if (overlap) throw new ApiError(409, '같은 시간에 이미 등록된 근무가 있습니다.', 'SHIFT_OVERLAP');

  const leaves = await client.query(
    `select id, target_date, end_date, all_day, start_time, end_time, status, reason
     from public.leave_requests
     where employee_id = $1
       and status in ('pending', 'approved')
       and target_date <= $2::date + 1
       and end_date >= $2::date - 1
     order by case status when 'approved' then 0 else 1 end, created_at`,
    [shift.employeeId, shift.date],
  );
  const conflictingLeaves = leaves.rows.filter((leave) => {
    const candidate = { date: shift.date, startTime: shift.startTime, endTime: shift.endTime };
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
  const approvedConflict = conflictingLeaves.find((leave) => leave.status === 'approved');
  if (approvedConflict) throw new ApiError(409, '승인된 휴무 신청과 시간이 겹쳐 배치할 수 없습니다.', 'APPROVED_LEAVE_CONFLICT');
  if (conflictingLeaves.length && !options.acknowledgeConflicts) {
    throw new ApiError(409, '대기 중인 휴무 신청과 시간이 겹칩니다. 확인 후 다시 저장해주세요.', 'PENDING_LEAVE_CONFLICT');
  }

  if (options.isUpdate) {
    const result = await client.query(
      `
        update public.shifts
        set store_id = $2, employee_id = $3, template_id = $4,
            work_date = $5, start_time = $6, end_time = $7,
            note = $8, updated_by_account = $9
        where id = $1 and status = 'scheduled'
          and ($10::timestamptz is null
            or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $10::timestamptz))
        returning *
      `,
      [shift.id, shift.storeId, shift.employeeId, shift.templateId, shift.date, shift.startTime, shift.endTime, shift.note, auth.id, shift.updatedAt],
    );
    if (!result.rows[0]) {
      const exists = await client.query('select id from public.shifts where id = $1 and status = $2', [shift.id, 'scheduled']);
      if (!exists.rows[0]) throw new ApiError(404, '수정할 근무를 찾을 수 없습니다.');
      throw new ApiError(409, '다른 사용자가 먼저 근무를 수정했습니다. 새로고침 후 다시 시도해주세요.', 'STALE_DATA');
    }
    return { shift: mapShift(result.rows[0]), warnings: conflictingLeaves.map(mapLeaveWarning) };
  }

  const result = await client.query(
    `
      insert into public.shifts (
        id, store_id, employee_id, template_id, work_date,
        start_time, end_time, note, status, source,
        created_by_account, updated_by_account
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', 'manual', $9, $9)
      returning *
    `,
    [shift.id, shift.storeId, shift.employeeId, shift.templateId, shift.date, shift.startTime, shift.endTime, shift.note, auth.id],
  );
  return { shift: mapShift(result.rows[0]), warnings: conflictingLeaves.map(mapLeaveWarning) };
  });
}

async function cancelShift(auth, body) {
  const shiftId = assertId(body.shiftId, '근무 ID');
  const current = await getPool().query('select store_id, updated_at from public.shifts where id = $1 and status = $2', [shiftId, 'scheduled']);
  if (!current.rows[0]) throw new ApiError(404, '삭제할 근무를 찾을 수 없습니다.');
  assertStoreAccess(auth, current.rows[0].store_id);
  const expectedUpdatedAt = body.updatedAt ? new Date(body.updatedAt) : null;
  if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) throw new ApiError(400, '근무 수정 시각이 올바르지 않습니다.');
  const result = await getPool().query(
    `update public.shifts
     set status = 'cancelled', cancelled_at = now(), cancelled_by_account = $2, updated_by_account = $2
     where id = $1 and status = 'scheduled'
       and ($3::timestamptz is null
         or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $3::timestamptz))
     returning id`,
    [shiftId, auth.id, expectedUpdatedAt?.toISOString() ?? null],
  );
  if (!result.rows[0]) throw new ApiError(409, '다른 사용자가 먼저 근무를 변경했습니다.', 'STALE_DATA');
  return { shiftId, status: 'cancelled' };
}

function normalizeShift(input, requireId) {
  if (!input || typeof input !== 'object') throw new ApiError(400, '근무 데이터 형식이 올바르지 않습니다.');
  const updatedAt = input.updatedAt ? new Date(input.updatedAt) : null;
  if (updatedAt && Number.isNaN(updatedAt.getTime())) throw new ApiError(400, '근무 수정 시각이 올바르지 않습니다.');
  return {
    id: requireId ? assertId(input.id, '근무 ID') : input.id ? assertId(input.id, '근무 ID') : crypto.randomUUID(),
    storeId: assertId(input.storeId, '근무지 ID'),
    employeeId: assertId(input.employeeId, '직원 ID'),
    templateId: assertOptionalId(input.templateId, '시간대 ID'),
    date: assertDate(input.date, '근무 날짜'),
    startTime: assertTime(input.startTime ?? String(input.time ?? '').split('-')[0], '시작 시간', false),
    endTime: assertTime(input.endTime ?? String(input.time ?? '').split('-')[1], '종료 시간', true),
    note: assertText(input.note ?? '', '근무 메모', 500, false),
    updatedAt: updatedAt?.toISOString() ?? null,
  };
}

function mapShift(row) {
  const startTime = normalizeDbTime(row.start_time);
  const endTime = normalizeDbTime(row.end_time);
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.store_name,
    date: toDateString(row.work_date),
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    templateId: row.template_id ?? '',
    templateLabel: row.template_label,
    templateColor: row.template_color,
    time: `${startTime}-${endTime}`,
    startTime,
    endTime,
    note: row.note || '',
    dayNote: row.day_note || '',
    status: row.status,
    source: row.source,
    hasLeaveConflict: Boolean(row.leave_conflict_status),
    leaveConflictStatus: row.leave_conflict_status ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function mapLeaveWarning(row) {
  return {
    id: row.id,
    status: row.status,
    targetDate: toDateString(row.target_date),
    endDate: toDateString(row.end_date ?? row.target_date),
    reason: row.reason,
  };
}
