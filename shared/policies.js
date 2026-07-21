export function resolveLeaveTransition({ role, action, currentStatus, isOwner }) {
  if (currentStatus !== 'pending') return null;
  if (role === 'manager') {
    if (action === 'approve') return 'approved';
    if (action === 'reject') return 'rejected';
    return null;
  }
  return role === 'employee' && isOwner && action === 'cancel' ? 'cancelled' : null;
}

export function canEditLeaveRequest({ role, currentStatus, isOwner }) {
  return role === 'employee' && currentStatus === 'pending' && isOwner;
}

export function canAssignEmployee({ employeeActive, employmentStatus, storeActive, canWorkStore }) {
  return Boolean(employeeActive)
    && employmentStatus === 'active'
    && Boolean(storeActive)
    && Boolean(canWorkStore);
}
