import {
  ApiError,
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
} from './_db.js';
import {
  assertDate,
  assertDateRange,
  assertId,
  assertText,
  normalizeDbTime,
  queryParams,
  toDateString,
} from './_validation.js';
import { resolveLeaveTransition } from '../../shared/policies.js';

const STATUSES = new Set(['pending', 'approved', 'rejected', 'cancelled']);

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['GET', 'POST', 'PUT', 'PATCH'])) return;
  if (!requireSameOrigin(request, response)) return;

  try {
    const auth = await requireAuth(request, response);
    if (!auth) return;
    assertPermission(auth, 'leaveRequests', request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : 'update');

    if (request.method === 'GET') {
      sendJson(response, 200, { requests: await fetchLeaveRequests(auth, request) });
      return;
    }

    const body = await readJsonBody(request);
    if (request.method === 'POST') {
      if (isManagerRole(auth.role)) throw new ApiError(403, '휴무 신청은 직원 계정에서 등록할 수 있습니다.');
      sendJson(response, 201, await createLeaveRequest(auth, body.request));
      return;
    }
    if (request.method === 'PUT') {
      if (isManagerRole(auth.role)) throw new ApiError(403, '직원 본인만 대기 신청을 수정할 수 있습니다.');
      sendJson(response, 200, await updateLeaveRequest(auth, body.request));
      return;
    }

    sendJson(response, 200, await transitionLeaveRequest(auth, body));
  } catch (error) {
    sendApiError(response, error, '휴무 신청을 처리하지 못했습니다.');
  }
}

async function fetchLeaveRequests(auth, request) {
  const params = queryParams(request);
  const status = params.get('status');
  if (status && status !== 'all' && !STATUSES.has(status)) throw new ApiError(400, '신청 상태 필터가 올바르지 않습니다.');
  let storeId = params.get('storeId');
  let employeeId = params.get('employeeId');
  if (isManagerRole(auth.role)) {
    if (storeId && storeId !== 'all') {
      storeId = assertId(storeId, '근무지 ID');
      assertStoreAccess(auth, storeId);
    } else {
      storeId = null;
    }
    employeeId = employeeId ? assertId(employeeId, '직원 ID') : null;
  } else {
    if (!auth.employeeId) throw new ApiError(403, '연결된 직원 프로필이 없습니다.');
    employeeId = auth.employeeId;
    storeId = null;
  }

  const rawStartDate = params.get('startDate');
  const rawEndDate = params.get('endDate');
  const range = rawStartDate || rawEndDate ? assertDateRange(rawStartDate, rawEndDate, 730) : null;
  const result = await getPool().query(
    `
      select
        leave_request.id,
        leave_request.employee_id,
        employee.name as employee_name,
        leave_request.store_id,
        store.name as store_name,
        leave_request.target_date,
        leave_request.end_date,
        leave_request.all_day,
        leave_request.start_time,
        leave_request.end_time,
        leave_request.reason,
        leave_request.status,
        leave_request.decision_reason,
        processor.display_name as processed_by_name,
        leave_request.processed_at,
        leave_request.created_at,
        leave_request.updated_at,
        exists (
          select 1 from public.shifts shift
          where shift.employee_id = leave_request.employee_id
            and shift.status = 'scheduled'
            and (
              shift.work_date between leave_request.target_date and leave_request.end_date
              or (
                shift.work_date = leave_request.target_date - 1
                and shift.end_time <= shift.start_time
              )
            )
        ) as has_schedule_conflict
      from public.leave_requests leave_request
      join public.employees employee on employee.id = leave_request.employee_id
      join public.stores store on store.id = leave_request.store_id
      left join public.app_users processor on processor.id = leave_request.processed_by
      where ($1::text is null or leave_request.status = $1)
        and ($2::text is null or leave_request.store_id = $2)
        and ($3::text is null or leave_request.employee_id = $3)
        and ($4::date is null or leave_request.end_date >= $4)
        and ($5::date is null or leave_request.target_date <= $5)
        and ($6::boolean or leave_request.store_id = any($7::text[]))
      order by
        case leave_request.status when 'pending' then 0 else 1 end,
        leave_request.target_date desc,
        leave_request.created_at desc
      limit 500
    `,
    [status && status !== 'all' ? status : null, storeId, employeeId, range?.startDate ?? null, range?.endDate ?? null, !isManagerRole(auth.role), auth.storeIds],
  );
  return result.rows.map(mapLeaveRequest);
}

async function createLeaveRequest(auth, input) {
  if (!auth.employeeId) throw new ApiError(403, '연결된 직원 프로필이 없습니다.');
  const request = normalizeLeaveInput(input);
  const eligible = await getPool().query(
    `select 1
     from public.employee_stores employee_store
     join public.employees employee on employee.id = employee_store.employee_id
     join public.stores store on store.id = employee_store.store_id
     where employee_store.employee_id = $1 and employee_store.store_id = $2
       and employee.is_active = true and store.is_active = true`,
    [auth.employeeId, request.storeId],
  );
  if (!eligible.rows[0]) throw new ApiError(403, '신청 가능한 근무지가 아닙니다.');
  if (request.targetDate < todayInSeoul()) throw new ApiError(400, '지난 날짜에는 휴무를 신청할 수 없습니다.');

  const result = await getPool().query(
    `
      insert into public.leave_requests (
        employee_id, store_id, target_date, end_date, all_day,
        start_time, end_time, reason, status, created_by_account
      ) values ($1, $2, $3, $4, true, null, null, $5, 'pending', $6)
      returning *
    `,
    [auth.employeeId, request.storeId, request.targetDate, request.endDate, request.reason, auth.id],
  );
  const hasScheduleConflict = await hasScheduleInRange(auth.employeeId, request.targetDate, request.endDate);
  return { request: mapLeaveRequest({ ...result.rows[0], has_schedule_conflict: hasScheduleConflict }) };
}

async function updateLeaveRequest(auth, input) {
  if (!auth.employeeId) throw new ApiError(403, '연결된 직원 프로필이 없습니다.');
  const id = assertId(input?.id, '신청 ID');
  const request = normalizeLeaveInput(input);
  const expectedUpdatedAt = input.updatedAt ? new Date(input.updatedAt) : null;
  if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) throw new ApiError(400, '신청 수정 시각이 올바르지 않습니다.');
  const eligible = await getPool().query(
    'select 1 from public.employee_stores where employee_id = $1 and store_id = $2',
    [auth.employeeId, request.storeId],
  );
  if (!eligible.rows[0]) throw new ApiError(403, '신청 가능한 근무지가 아닙니다.');
  if (request.targetDate < todayInSeoul()) throw new ApiError(400, '지난 날짜로 신청을 수정할 수 없습니다.');

  const result = await getPool().query(
    `
      update public.leave_requests
      set store_id = $3, target_date = $4, end_date = $5, all_day = true,
          start_time = null, end_time = null, reason = $6
      where id = $1 and employee_id = $2 and status = 'pending'
        and ($7::timestamptz is null
          or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $7::timestamptz))
      returning *
    `,
    [id, auth.employeeId, request.storeId, request.targetDate, request.endDate, request.reason, expectedUpdatedAt?.toISOString() ?? null],
  );
  if (!result.rows[0]) throw new ApiError(409, '대기 중인 본인 신청만 수정할 수 있습니다.', 'INVALID_LEAVE_TRANSITION');
  const hasScheduleConflict = await hasScheduleInRange(auth.employeeId, request.targetDate, request.endDate);
  return { request: mapLeaveRequest({ ...result.rows[0], has_schedule_conflict: hasScheduleConflict }) };
}

async function transitionLeaveRequest(auth, body) {
  const id = assertId(body.requestId, '신청 ID');
  const action = String(body.action ?? '');
  if (!['approve', 'reject', 'cancel'].includes(action)) throw new ApiError(400, '올바르지 않은 상태 변경입니다.');
  const current = await getPool().query(
    'select employee_id, store_id, target_date, end_date, status from public.leave_requests where id = $1',
    [id],
  );
  const currentRequest = current.rows[0];
  if (!currentRequest) throw new ApiError(404, '휴무 신청을 찾을 수 없습니다.');
  const isManager = isManagerRole(auth.role);
  const isOwner = Boolean(auth.employeeId) && auth.employeeId === currentRequest.employee_id;
  const nextStatus = resolveLeaveTransition({
    role: auth.role,
    action,
    currentStatus: currentRequest.status,
    isOwner,
  });
  if (!nextStatus) {
    if (!isManager && action !== 'cancel') throw new ApiError(403, '직원은 본인 신청 취소만 할 수 있습니다.');
    if (isManager && action === 'cancel') throw new ApiError(403, '관리자는 신청을 승인하거나 반려해주세요.');
    throw new ApiError(409, '이미 처리되었거나 본인이 아닌 신청입니다.', 'INVALID_LEAVE_TRANSITION');
  }

  if (!isManager) {
    const result = await getPool().query(
      `update public.leave_requests
       set status = 'cancelled', processed_at = now(), decision_reason = ''
       where id = $1 and employee_id = $2 and status = 'pending'
       returning *`,
      [id, auth.employeeId],
    );
    if (!result.rows[0]) throw new ApiError(409, '대기 중인 본인 신청만 취소할 수 있습니다.', 'INVALID_LEAVE_TRANSITION');
    return { request: mapLeaveRequest(result.rows[0]) };
  }

  assertStoreAccess(auth, currentRequest.store_id);
  const decisionReason = assertText(body.decisionReason ?? '', '처리 사유', 500, action === 'reject');
  const result = await getPool().query(
    `update public.leave_requests
     set status = $2, decision_reason = $3, processed_by = $4, processed_at = now()
     where id = $1 and status = 'pending'
     returning *`,
    [id, nextStatus, decisionReason, auth.id],
  );
  if (!result.rows[0]) throw new ApiError(409, '이미 처리되었거나 취소된 신청입니다.', 'INVALID_LEAVE_TRANSITION');
  const hasScheduleConflict = await hasScheduleInRange(
    result.rows[0].employee_id,
    toDateString(result.rows[0].target_date),
    toDateString(result.rows[0].end_date),
  );
  return { request: mapLeaveRequest({ ...result.rows[0], has_schedule_conflict: hasScheduleConflict }) };
}

function normalizeLeaveInput(input) {
  if (!input || typeof input !== 'object') throw new ApiError(400, '휴무 신청 형식이 올바르지 않습니다.');
  const targetDate = assertDate(input.targetDate, '신청 시작 날짜');
  const endDate = assertDate(input.endDate ?? input.targetDate, '신청 종료 날짜');
  assertDateRange(targetDate, endDate, 90);
  return {
    storeId: assertId(input.storeId, '근무지 ID'),
    targetDate,
    endDate,
    reason: assertText(input.reason, '신청 사유', 500),
  };
}

async function hasScheduleInRange(employeeId, targetDate, endDate) {
  const result = await getPool().query(
    `select exists(
      select 1 from public.shifts
      where employee_id = $1 and status = 'scheduled'
        and (
          work_date between $2 and $3
          or (work_date = $2::date - 1 and end_time <= start_time)
        )
    ) as has_conflict`,
    [employeeId, targetDate, endDate],
  );
  return Boolean(result.rows[0]?.has_conflict);
}

function mapLeaveRequest(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name ?? '',
    storeId: row.store_id,
    storeName: row.store_name ?? '',
    targetDate: toDateString(row.target_date),
    endDate: toDateString(row.end_date ?? row.target_date),
    allDay: Boolean(row.all_day),
    startTime: normalizeDbTime(row.start_time),
    endTime: normalizeDbTime(row.end_time),
    reason: row.reason,
    status: row.status,
    decisionReason: row.decision_reason ?? '',
    processedByName: row.processed_by_name ?? null,
    processedAt: row.processed_at?.toISOString?.() ?? row.processed_at ?? null,
    hasScheduleConflict: Boolean(row.has_schedule_conflict),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
