import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import { shiftsOverlap } from '../shared/schedule.js';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const adminUsername = process.env.TEST_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.TEST_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('TEST_ADMIN_PASSWORD 환경변수가 필요합니다.');
if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL 환경변수가 필요합니다.');

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const ids = {
  employee: `test-employee-${suffix}`,
  employeeUsername: `test.employee.${suffix}`,
  managerUsername: `test.manager.${suffix}`,
  store: `test-store-${suffix}`,
  template: `test-template-${suffix}`,
  noteDate: '2099-01-11',
  shift: `test-shift-${suffix}`,
  protectedShift: `test-protected-shift-${suffix}`,
};
const employeePassword = `Test-${crypto.randomBytes(8).toString('hex')}!`;
const changedEmployeePassword = `Changed-${crypto.randomBytes(8).toString('hex')}!`;
const managerPassword = `Test-${crypto.randomBytes(8).toString('hex')}!`;
const changedManagerPassword = `Changed-${crypto.randomBytes(8).toString('hex')}!`;
let adminCookie = '';
let employeeCookie = '';
let managerCookie = '';
let leaveId = '';
let managerAccountId = '';
let ruleId = '';
let protectedRuleId = '';

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 1,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5_000,
  query_timeout: 15_000,
  statement_timeout: 15_000,
});

try {
  const adminLogin = await api('/api/login', {
    method: 'POST',
    body: { username: adminUsername, password: adminPassword },
    expectedStatus: 200,
  });
  adminCookie = adminLogin.cookie;
  assert.equal(adminLogin.data.user.role, 'manager');
  assert.ok(adminLogin.data.user.id);

  const reference = await api('/api/schedule', { cookie: adminCookie, expectedStatus: 200 });
  const stores = reference.data.state.stores.filter((store) => store.isActive);
  const templates = reference.data.state.templates.filter((template) => !template.requiresTimeInput);
  const existingEmployees = reference.data.state.employees;
  assert.ok(stores.length >= 2, '담당 매장 범위 검증에는 활성 근무지 2개 이상이 필요합니다.');
  assert.ok(templates.length, '고정 시간대가 한 개 이상 필요합니다.');
  const primaryStore = stores[0];
  const otherStore = stores[1];
  const template = templates[0];

  const storeCreate = await api('/api/stores', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { store: { id: ids.store, name: '통합 테스트점', address: '테스트 주소', phone: '', memo: '', isActive: true, color: '#6654e8' } },
  });
  assert.equal(storeCreate.data.store.id, ids.store);
  await api('/api/stores', {
    method: 'PUT', cookie: adminCookie, expectedStatus: 200,
    body: { store: { ...storeCreate.data.store, name: '통합 테스트점 수정', isActive: true } },
  });
  await api('/api/stores', { method: 'DELETE', cookie: adminCookie, expectedStatus: 200, body: { storeId: ids.store } });
  const activeStores = await api('/api/stores', { cookie: adminCookie, expectedStatus: 200 });
  assert.equal(activeStores.data.stores.some((store) => store.id === ids.store), false);

  const templateCreate = await api('/api/templates', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { template: { id: ids.template, label: `통합 테스트 ${suffix}`, startTime: '09:00', endTime: '10:00', color: '#7957d5', requiresTimeInput: false } },
  });
  assert.equal(templateCreate.data.template.id, ids.template);
  await api('/api/templates', {
    method: 'PUT', cookie: adminCookie, expectedStatus: 200,
    body: { template: { id: ids.template, label: `통합 테스트 수정 ${suffix}`, startTime: '09:00', endTime: '10:00', color: '#7957d5', requiresTimeInput: false } },
  });

  const employeeCreate = await api('/api/employees', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: {
      employee: {
        id: ids.employee, name: '통합 테스트 직원', preference: '', color: '#dceeff',
        storeIds: [primaryStore.id, otherStore.id],
        baseShifts: [{ id: `test-base-${suffix}`, storeId: primaryStore.id, weekday: 1, templateId: ids.template, startTime: '09:00', endTime: '10:00' }],
      },
      account: { username: ids.employeeUsername, password: employeePassword },
    },
  });
  assert.equal(employeeCreate.data.employee.accountStatus, 'active');
  assert.ok(employeeCreate.data.initialPassword);
  await api('/api/accounts', {
    method: 'POST', cookie: adminCookie, expectedStatus: 409,
    body: {
      account: {
        username: `duplicate.${suffix}`,
        displayName: '중복 연결 테스트',
        password: employeePassword,
        role: 'employee',
        status: 'active',
        employeeId: ids.employee,
        storeIds: [primaryStore.id, otherStore.id],
        permissions: readOnlySchedulePermissions(),
      },
    },
  });

  const managerCreate = await api('/api/accounts', {
    method: 'POST', cookie: adminCookie, expectedStatus: 200,
    body: { account: { username: ids.managerUsername, displayName: '통합 테스트 매니저', password: managerPassword, role: 'manager', status: 'active', storeIds: [primaryStore.id], permissions: readOnlySchedulePermissions() } },
  });
  managerAccountId = managerCreate.data.account.id;
  assert.ok(managerCreate.data.initialPassword);

  const otherStoreEmployee = existingEmployees.find((employee) =>
    employee.isActive !== false && employee.storeIds.includes(otherStore.id));
  assert.ok(otherStoreEmployee, '타 매장 권한 변조 검증을 위한 활성 직원이 필요합니다.');
  const [protectedStartTime, protectedEndTime] = template.time.split('-');
  const protectedShiftCreate = await api('/api/shifts', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { shift: { id: ids.protectedShift, storeId: otherStore.id, employeeId: otherStoreEmployee.id, templateId: template.id, date: '2099-01-13', startTime: protectedStartTime, endTime: protectedEndTime, note: '권한 범위 검증' } },
  });
  const protectedRuleCreate = await api('/api/schedule-rules', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { rule: { storeId: otherStore.id, weekday: 4, templateId: template.id, startTime: '05:13', endTime: '06:13', minimumStaff: 1 } },
  });
  protectedRuleId = protectedRuleCreate.data.rule.id;

  const managerLogin = await api('/api/login', {
    method: 'POST', expectedStatus: 200,
    body: { username: ids.managerUsername, password: managerPassword },
  });
  managerCookie = managerLogin.cookie;
  assert.equal(managerLogin.data.user.mustChangePassword, true);
  await api(`/api/shifts?storeId=${encodeURIComponent(primaryStore.id)}&startDate=2099-01-01&endDate=2099-01-31`, {
    cookie: managerCookie, expectedStatus: 403,
  });
  await api('/api/session', {
    method: 'PUT', cookie: managerCookie, expectedStatus: 200,
    body: { currentPassword: managerPassword, nextPassword: changedManagerPassword },
  });
  await api(`/api/shifts?storeId=${encodeURIComponent(primaryStore.id)}&startDate=2099-01-01&endDate=2099-01-31`, {
    cookie: managerCookie, expectedStatus: 200,
  });
  await api('/api/shifts', {
    method: 'POST', cookie: managerCookie, expectedStatus: 403,
    body: { shift: { storeId: primaryStore.id, employeeId: ids.employee, templateId: template.id, date: '2099-01-12', startTime: '09:00', endTime: '10:00', note: '' } },
  });
  await api(`/api/shifts?storeId=${encodeURIComponent(otherStore.id)}&startDate=2099-01-01&endDate=2099-01-31`, {
    cookie: managerCookie, expectedStatus: 403,
  });

  const scopedMutationPermissions = readOnlySchedulePermissions();
  scopedMutationPermissions.schedule.update = true;
  scopedMutationPermissions.settings.update = true;
  scopedMutationPermissions.employees.update = true;
  scopedMutationPermissions.employees.delete = true;
  scopedMutationPermissions.accounts.update = true;
  await api('/api/accounts', {
    method: 'PUT', cookie: adminCookie, expectedStatus: 200,
    body: { account: { ...managerCreate.data.account, permissions: scopedMutationPermissions } },
  });
  await api('/api/shifts', {
    method: 'PUT', cookie: managerCookie, expectedStatus: 403,
    body: { shift: { ...protectedShiftCreate.data.shift, storeId: primaryStore.id, employeeId: ids.employee } },
  });
  await api('/api/schedule-rules', {
    method: 'PUT', cookie: managerCookie, expectedStatus: 403,
    body: { rule: { ...protectedRuleCreate.data.rule, storeId: primaryStore.id } },
  });
  const scopedEmployeeUpdate = await api('/api/employees', {
    method: 'PUT', cookie: managerCookie, expectedStatus: 200,
    body: { employee: { ...employeeCreate.data.employee, name: '통합 테스트 직원 수정', storeIds: [primaryStore.id] } },
  });
  assert.deepEqual(new Set(scopedEmployeeUpdate.data.employee.storeIds), new Set([primaryStore.id, otherStore.id]));
  await api('/api/employees', {
    method: 'PATCH', cookie: managerCookie, expectedStatus: 403,
    body: { action: 'set-status', employeeId: ids.employee, status: 'inactive' },
  });
  await api('/api/accounts', {
    method: 'PATCH', cookie: managerCookie, expectedStatus: 403,
    body: { action: 'reset-password', accountId: employeeCreate.data.employee.accountId },
  });

  const employeeLogin = await api('/api/login', {
    method: 'POST', expectedStatus: 200,
    body: { username: ids.employeeUsername, password: employeePassword },
  });
  employeeCookie = employeeLogin.cookie;
  assert.equal(employeeLogin.data.user.role, 'employee');
  assert.equal(employeeLogin.data.user.mustChangePassword, true);
  await api('/api/session', {
    method: 'PUT', cookie: employeeCookie, expectedStatus: 200,
    body: { currentPassword: employeePassword, nextPassword: changedEmployeePassword },
  });
  const changedSession = await api('/api/session', { cookie: employeeCookie, expectedStatus: 200 });
  assert.equal(changedSession.data.user.mustChangePassword, false);

  const profile = await api('/api/me?resource=profile', { cookie: employeeCookie, expectedStatus: 200 });
  assert.equal(profile.data.profile.id, ids.employee);
  await api('/api/accounts', { cookie: employeeCookie, expectedStatus: 403 });

  const tamperedShifts = await api(`/api/shifts?startDate=2099-01-01&endDate=2099-01-31&employeeId=${encodeURIComponent(existingEmployees[0]?.id || 'other')}`, {
    cookie: employeeCookie, expectedStatus: 200,
  });
  assert.ok(tamperedShifts.data.shifts.every((shift) => shift.employeeId === ids.employee));
  const teamShifts = await api('/api/shifts?scope=team&startDate=2099-01-07&endDate=2099-01-13', {
    cookie: employeeCookie, expectedStatus: 200,
  });
  const visibleTeamShift = teamShifts.data.shifts.find((shift) => shift.id === ids.protectedShift && shift.employeeId !== ids.employee);
  assert.ok(visibleTeamShift);
  assert.equal(visibleTeamShift.note, '');
  assert.ok(teamShifts.data.shifts.every((shift) => shift.leaveConflictStatus === null));
  assert.ok(Array.isArray(teamShifts.data.dayNotes));

  const leaveCreate = await api('/api/leave-requests', {
    method: 'POST', cookie: employeeCookie, expectedStatus: 201,
    body: { request: { storeId: primaryStore.id, targetDate: '2099-01-10', endDate: '2099-01-12', reason: '통합 테스트 신청' } },
  });
  leaveId = leaveCreate.data.request.id;
  await api('/api/leave-requests', {
    method: 'POST', cookie: employeeCookie, expectedStatus: 400,
    body: { request: { storeId: primaryStore.id, targetDate: '2099-01-13', endDate: '2099-01-12', reason: '잘못된 날짜 범위' } },
  });
  const leaveUpdate = await api('/api/leave-requests', {
    method: 'PUT', cookie: employeeCookie, expectedStatus: 200,
    body: { request: { ...leaveCreate.data.request, reason: '통합 테스트 신청 수정' } },
  });
  assert.equal(leaveUpdate.data.request.status, 'pending');
  const cancelCandidate = await api('/api/leave-requests', {
    method: 'POST', cookie: employeeCookie, expectedStatus: 201,
    body: { request: { storeId: primaryStore.id, targetDate: '2099-01-11', endDate: '2099-01-13', reason: '통합 테스트 취소 신청' } },
  });
  assert.equal(cancelCandidate.data.request.endDate, '2099-01-13');
  assert.equal(cancelCandidate.data.request.allDay, true);
  assert.equal(cancelCandidate.data.request.startTime, null);
  const cancelledLeave = await api('/api/leave-requests', {
    method: 'PATCH', cookie: employeeCookie, expectedStatus: 200,
    body: { requestId: cancelCandidate.data.request.id, action: 'cancel' },
  });
  assert.equal(cancelledLeave.data.request.status, 'cancelled');
  const rejectCandidate = await api('/api/leave-requests', {
    method: 'POST', cookie: employeeCookie, expectedStatus: 201,
    body: { request: { storeId: primaryStore.id, targetDate: '2099-01-12', allDay: true, startTime: null, endTime: null, reason: '통합 테스트 반려 신청' } },
  });
  const rejectedLeave = await api('/api/leave-requests', {
    method: 'PATCH', cookie: adminCookie, expectedStatus: 200,
    body: { requestId: rejectCandidate.data.request.id, action: 'reject', decisionReason: '통합 테스트 반려' },
  });
  assert.equal(rejectedLeave.data.request.status, 'rejected');
  const pendingList = await api(`/api/leave-requests?employeeId=${encodeURIComponent(ids.employee)}&status=pending`, {
    cookie: adminCookie, expectedStatus: 200,
  });
  assert.equal(pendingList.data.requests.some((request) => request.id === leaveId), true);
  const leaveRow = await pool.query(
    'select target_date::text, end_date::text, all_day, start_time, end_time, status from public.leave_requests where id = $1',
    [leaveId],
  );
  assert.equal(leaveRow.rows[0].all_day, true);
  assert.equal(leaveRow.rows[0].end_date, '2099-01-12');
  assert.equal(leaveRow.rows[0].status, 'pending');

  const [startTime, endTime] = template.time.split('-');
  assert.equal(shiftsOverlap(
    { date: '2099-01-10', startTime, endTime },
    { date: '2099-01-10', startTime: '00:00', endTime: '24:00' },
  ), true);
  const pendingConflict = await api('/api/shifts', {
    method: 'POST', cookie: adminCookie,
    body: { shift: { id: ids.shift, storeId: primaryStore.id, employeeId: ids.employee, templateId: template.id, date: '2099-01-11', startTime, endTime, note: '' } },
  });
  assert.equal(pendingConflict.status, 409, `대기 휴무 충돌 응답: ${JSON.stringify(pendingConflict.data)}`);
  const shiftCreate = await api('/api/shifts', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { acknowledgeConflicts: true, shift: { id: ids.shift, storeId: primaryStore.id, employeeId: ids.employee, templateId: template.id, date: '2099-01-11', startTime, endTime, note: '' } },
  });
  assert.equal(shiftCreate.data.shift.employeeId, ids.employee);
  await api('/api/shifts', {
    method: 'POST', cookie: adminCookie, expectedStatus: 409,
    body: { acknowledgeConflicts: true, shift: { storeId: primaryStore.id, employeeId: ids.employee, templateId: template.id, date: '2099-01-11', startTime, endTime, note: '' } },
  });

  const leaveApproval = await api('/api/leave-requests', {
    method: 'PATCH', cookie: adminCookie, expectedStatus: 200,
    body: { requestId: leaveId, action: 'approve', decisionReason: '통합 테스트 승인' },
  });
  assert.equal(leaveApproval.data.request.status, 'approved');
  assert.equal(leaveApproval.data.request.hasScheduleConflict, true);
  await api('/api/leave-requests', {
    method: 'PUT', cookie: employeeCookie, expectedStatus: 409,
    body: { request: { ...leaveUpdate.data.request, reason: '승인 후 변경 시도' } },
  });

  const hours = await api('/api/me?resource=hours&month=2099-01', { cookie: employeeCookie, expectedStatus: 200 });
  assert.ok(hours.data.summary.totalMinutes > 0);
  const dashboard = await api(`/api/dashboard?storeId=${encodeURIComponent(primaryStore.id)}&month=2099-01`, {
    cookie: adminCookie, expectedStatus: 200,
  });
  assert.ok(dashboard.data.dashboard.totalMinutes > 0);
  assert.ok(dashboard.data.dashboard.storeHours.some((item) => item.storeId === primaryStore.id && item.minutes > 0));
  await api('/api/shifts', {
    method: 'DELETE', cookie: adminCookie, expectedStatus: 200,
    body: { shiftId: ids.shift, updatedAt: shiftCreate.data.shift.updatedAt },
  });

  const noteCreate = await api('/api/notes', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { note: { storeId: primaryStore.id, date: ids.noteDate, text: '통합 테스트 메모', visibleToEmployees: true } },
  });
  assert.equal(noteCreate.data.note.text, '통합 테스트 메모');
  await api('/api/notes', {
    method: 'PUT', cookie: adminCookie, expectedStatus: 200,
    body: { note: { ...noteCreate.data.note, text: '통합 테스트 메모 수정' } },
  });
  await api('/api/notes', { method: 'DELETE', cookie: adminCookie, expectedStatus: 200, body: { storeId: primaryStore.id, date: ids.noteDate } });

  const ruleCreate = await api('/api/schedule-rules', {
    method: 'POST', cookie: adminCookie, expectedStatus: 201,
    body: { rule: { storeId: primaryStore.id, weekday: 2, templateId: ids.template, startTime: '03:17', endTime: '04:17', minimumStaff: 1 } },
  });
  ruleId = ruleCreate.data.rule.id;
  await api('/api/schedule-rules', { method: 'DELETE', cookie: adminCookie, expectedStatus: 200, body: { ruleId } });

  const accountsBeforeReset = await api('/api/accounts', { cookie: adminCookie, expectedStatus: 200 });
  const employeeAccount = accountsBeforeReset.data.accounts.find((account) => account.employeeId === ids.employee);
  assert.ok(employeeAccount);
  assert.equal(employeeAccount.displayName, '통합 테스트 직원 수정');
  const passwordReset = await api('/api/accounts', {
    method: 'PATCH', cookie: adminCookie, expectedStatus: 200,
    body: { action: 'reset-password', accountId: employeeAccount.id },
  });
  assert.ok(passwordReset.data.initialPassword);
  await api('/api/login', {
    method: 'POST', expectedStatus: 401,
    body: { username: ids.employeeUsername, password: changedEmployeePassword },
  });
  await api('/api/login', {
    method: 'POST', expectedStatus: 200,
    body: { username: ids.employeeUsername, password: passwordReset.data.initialPassword },
  });
  await api('/api/accounts', {
    method: 'PUT', cookie: adminCookie, expectedStatus: 200,
    body: { account: { ...employeeAccount, status: 'inactive' } },
  });
  await api('/api/login', {
    method: 'POST', expectedStatus: 401,
    body: { username: ids.employeeUsername, password: passwordReset.data.initialPassword },
  });
  const accountDeletion = await api('/api/accounts', {
    method: 'DELETE', cookie: adminCookie, expectedStatus: 200,
    body: { accountId: employeeAccount.id },
  });
  assert.equal(accountDeletion.data.employeeId, ids.employee);
  assert.equal(accountDeletion.data.accounts.some((account) => account.id === employeeAccount.id), false);
  const employeesAfterAccountDeletion = await api('/api/employees?includeInactive=true', {
    cookie: adminCookie, expectedStatus: 200,
  });
  assert.equal(employeesAfterAccountDeletion.data.employees.some((employee) => employee.id === ids.employee), false);
  const deletedRows = await pool.query(
    `select
       (select deleted_at is not null from public.app_users where id = $1) as account_deleted,
       (select deleted_at is not null and employment_status = 'terminated' from public.employees where id = $2) as employee_deleted`,
    [employeeAccount.id, ids.employee],
  );
  assert.equal(deletedRows.rows[0].account_deleted, true);
  assert.equal(deletedRows.rows[0].employee_deleted, true);
  await api('/api/templates', { method: 'DELETE', cookie: adminCookie, expectedStatus: 200, body: { templateId: ids.template } });

  process.stdout.write('API 통합 테스트 통과: 인증, 매장, 시간대, 직원/계정, 권한 범위, 휴무, 스케줄, 메모, 규칙\n');
} finally {
  await cleanup();
  await pool.end();
}

async function api(path, { method = 'GET', body, cookie = '', expectedStatus } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...(method === 'GET' ? {} : { origin: baseUrl }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, `${method} ${path}: ${data.message || response.statusText}`);
  }
  return { data, status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from public.schedule_rules where id = any($1::uuid[]) or (store_id = (select id from public.stores where id = $2))', [[ruleId, protectedRuleId].filter(Boolean), ids.store]);
    await client.query('delete from public.day_notes where store_id = $1 or (note_date = $2 and text like $3)', [ids.store, ids.noteDate, '통합 테스트%']);
    await client.query('delete from public.leave_requests where id = $1 or employee_id = $2', [leaveId || crypto.randomUUID(), ids.employee]);
    await client.query('delete from public.shifts where id = any($1::text[]) or employee_id = $2', [[ids.shift, ids.protectedShift], ids.employee]);
    await client.query('delete from public.app_users where id = $1 or username in ($2, $3)', [managerAccountId || crypto.randomUUID(), ids.employeeUsername, ids.managerUsername]);
    await client.query('delete from public.employee_base_shifts where employee_id = $1', [ids.employee]);
    await client.query('delete from public.employee_stores where employee_id = $1', [ids.employee]);
    await client.query('delete from public.employees where id = $1', [ids.employee]);
    await client.query('delete from public.shift_templates where id = $1', [ids.template]);
    await client.query('delete from public.stores where id = $1', [ids.store]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function readOnlySchedulePermissions() {
  const none = { view: false, create: false, update: false, delete: false };
  return {
    dashboard: { ...none },
    schedule: { view: true, create: false, update: false, delete: false },
    employees: { ...none },
    notes: { ...none },
    settings: { ...none },
    leaveRequests: { ...none },
    accounts: { ...none },
  };
}
