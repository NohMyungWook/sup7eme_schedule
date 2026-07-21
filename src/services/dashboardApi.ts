import { apiRequest } from './apiClient';

export type DashboardData = {
  storeId: string;
  month: string;
  registeredShifts: number;
  totalMinutes: number;
  participatingEmployees: number;
  employeeHours: Array<{ employeeId: string; employeeName: string; minutes: number }>;
  storeHours: Array<{ storeId: string; storeName: string; minutes: number }>;
  gaps: Array<{ date: string; startTime: string; endTime: string; required: number; assigned: number }>;
  hasCoverageRules: boolean;
  coverageByDate: Array<{
    date: string;
    isComplete: boolean;
    uncoveredRanges: Array<{ startTime: string; endTime: string }>;
  }>;
};

export async function fetchDashboard(storeId: string, month: string) {
  const query = new URLSearchParams({ storeId, month });
  const payload = await apiRequest<{ dashboard: DashboardData }>(`/api/dashboard?${query}`, { errorMessage: '대시보드를 불러오지 못했습니다.' });
  return payload.dashboard;
}
