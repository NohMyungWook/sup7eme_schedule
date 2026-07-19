import type { Shift, Store } from '../domain/types';
import { apiRequest } from './apiClient';

export type EmployeeProfile = {
  id: string;
  name: string;
  color: string;
  employmentStatus: string;
  username: string;
  mustChangePassword: boolean;
  stores: Array<Pick<Store, 'id' | 'name' | 'color'>>;
};

export type MonthlyHours = {
  month: string;
  totalMinutes: number;
  workDays: number;
  days: Array<{ id: string; date: string; storeId: string; storeName: string; startTime: string; endTime: string; minutes: number }>;
  byStore: Array<{ storeId: string; storeName: string; minutes: number }>;
  byWeek: Array<{ week: number; minutes: number }>;
};

export async function fetchEmployeeProfile() {
  const payload = await apiRequest<{ profile: EmployeeProfile }>('/api/me?resource=profile', { errorMessage: '내 정보를 불러오지 못했습니다.' });
  return payload.profile;
}

export async function fetchMyShifts(startDate: string, endDate: string) {
  const query = new URLSearchParams({ startDate, endDate });
  const payload = await apiRequest<{ shifts: Shift[] }>(`/api/shifts?${query}`, { errorMessage: '내 스케줄을 불러오지 못했습니다.' });
  return payload.shifts ?? [];
}

export async function fetchMonthlyHours(month: string) {
  const payload = await apiRequest<{ summary: MonthlyHours }>(`/api/me?resource=hours&month=${encodeURIComponent(month)}`, { errorMessage: '월간 근무시간을 불러오지 못했습니다.' });
  return payload.summary;
}
