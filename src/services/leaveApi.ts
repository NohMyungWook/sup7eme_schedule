import type { LeaveRequest } from '../domain/types';
import { apiRequest } from './apiClient';

export type LeaveDraft = {
  id?: string;
  storeId: string;
  targetDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  updatedAt?: string;
};

export async function fetchLeaveRequests(query = '') {
  const payload = await apiRequest<{ requests: LeaveRequest[] }>(`/api/leave-requests${query}`, {
    errorMessage: '휴무 신청 내역을 불러오지 못했습니다.',
  });
  return payload.requests ?? [];
}

export async function saveLeaveRequest(request: LeaveDraft) {
  return apiRequest<{ request: LeaveRequest }>('/api/leave-requests', {
    method: request.id ? 'PUT' : 'POST', body: { request }, errorMessage: '휴무 신청을 저장하지 못했습니다.',
  });
}

export async function transitionLeaveRequest(requestId: string, action: 'approve' | 'reject' | 'cancel', decisionReason = '') {
  return apiRequest<{ request: LeaveRequest }>('/api/leave-requests', {
    method: 'PATCH', body: { requestId, action, decisionReason }, errorMessage: '휴무 신청 상태를 변경하지 못했습니다.',
  });
}
