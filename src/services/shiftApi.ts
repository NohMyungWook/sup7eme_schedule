import type { Shift } from '../domain/types';
import { apiRequest } from './apiClient';

export async function saveShiftToApi(shift: Shift, isUpdate: boolean, acknowledgeConflicts = false) {
  const payload = await apiRequest<{ shift: Shift; warnings?: Array<{ type: string }> }>('/api/shifts', {
    method: isUpdate ? 'PUT' : 'POST',
    body: { shift, acknowledgeConflicts },
    errorMessage: '근무를 저장하지 못했습니다.',
  });
  return payload;
}

export async function fetchAdminShifts(storeId: string, startDate: string, endDate: string) {
  const query = new URLSearchParams({ storeId, startDate, endDate });
  const payload = await apiRequest<{ shifts: Shift[] }>(`/api/shifts?${query}`, { errorMessage: '스케줄을 불러오지 못했습니다.' });
  return payload.shifts ?? [];
}

export async function cancelShiftFromApi(shiftId: string, updatedAt?: string) {
  await apiRequest<{ shiftId: string }>('/api/shifts', {
    method: 'DELETE', body: { shiftId, updatedAt }, errorMessage: '근무를 삭제하지 못했습니다.',
  });
}

export async function runScheduleAction(action: 'copy-previous-week' | 'generate-base-week', storeId: string, weekStart: string, overwrite = false) {
  return apiRequest<{ created: number; skipped: number; conflicts: Array<{ type: string }> }>('/api/schedule-actions', {
    method: 'POST', body: { action, storeId, weekStart, overwrite }, errorMessage: '주간 스케줄을 생성하지 못했습니다.',
  });
}
