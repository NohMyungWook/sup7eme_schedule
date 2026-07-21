import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStoreAccess, normalizePermissions } from '../api/_db.js';
import {
  canAssignEmployee,
  canEditLeaveRequest,
  resolveLeaveTransition,
} from '../shared/policies.js';

test('직원은 본인의 대기 신청만 수정하거나 취소할 수 있다', () => {
  assert.equal(canEditLeaveRequest({ role: 'employee', currentStatus: 'pending', isOwner: true }), true);
  assert.equal(canEditLeaveRequest({ role: 'employee', currentStatus: 'approved', isOwner: true }), false);
  assert.equal(resolveLeaveTransition({ role: 'employee', action: 'cancel', currentStatus: 'pending', isOwner: true }), 'cancelled');
  assert.equal(resolveLeaveTransition({ role: 'employee', action: 'cancel', currentStatus: 'pending', isOwner: false }), null);
});

test('관리자는 대기 신청만 승인 또는 반려할 수 있다', () => {
  assert.equal(resolveLeaveTransition({ role: 'manager', action: 'approve', currentStatus: 'pending', isOwner: false }), 'approved');
  assert.equal(resolveLeaveTransition({ role: 'manager', action: 'reject', currentStatus: 'pending', isOwner: false }), 'rejected');
  assert.equal(resolveLeaveTransition({ role: 'manager', action: 'approve', currentStatus: 'cancelled', isOwner: false }), null);
});

test('비활성 직원, 비활성 매장, 근무 불가 매장은 신규 배치를 차단한다', () => {
  assert.equal(canAssignEmployee({ employeeActive: true, employmentStatus: 'active', storeActive: true, canWorkStore: true }), true);
  assert.equal(canAssignEmployee({ employeeActive: false, employmentStatus: 'inactive', storeActive: true, canWorkStore: true }), false);
  assert.equal(canAssignEmployee({ employeeActive: true, employmentStatus: 'active', storeActive: false, canWorkStore: true }), false);
  assert.equal(canAssignEmployee({ employeeActive: true, employmentStatus: 'active', storeActive: true, canWorkStore: false }), false);
});

test('관리자는 담당 매장 안에서만 접근할 수 있다', () => {
  assert.doesNotThrow(() => assertStoreAccess({ role: 'manager', storeIds: ['sadang'] }, 'sadang'));
  assert.throws(() => assertStoreAccess({ role: 'manager', storeIds: ['sadang'] }, 'gwacheon'), /접근할 권한/);
});

test('직원 기본 권한에는 관리자 데이터 변경 권한이 없다', () => {
  const permissions = normalizePermissions({}, 'employee');
  assert.equal(permissions.schedule.view, true);
  assert.equal(permissions.schedule.update, false);
  assert.equal(permissions.employees.view, false);
  assert.equal(permissions.settings.view, false);
});
