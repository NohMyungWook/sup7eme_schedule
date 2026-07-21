export type LeaveTransitionInput = {
  role: 'manager' | 'employee';
  action: 'approve' | 'reject' | 'cancel';
  currentStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  isOwner: boolean;
};

export function resolveLeaveTransition(input: LeaveTransitionInput): 'approved' | 'rejected' | 'cancelled' | null;
export function canEditLeaveRequest(input: Pick<LeaveTransitionInput, 'role' | 'currentStatus' | 'isOwner'>): boolean;
export function canAssignEmployee(input: {
  employeeActive: boolean;
  employmentStatus: string;
  storeActive: boolean;
  canWorkStore: boolean;
}): boolean;
