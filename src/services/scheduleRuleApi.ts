import { apiRequest } from './apiClient';

export type ScheduleRule = {
  id: string;
  storeId: string;
  storeName?: string;
  weekday: number;
  templateId: string | null;
  templateLabel?: string | null;
  startTime: string;
  endTime: string;
  minimumStaff: number;
};

export async function fetchScheduleRules() {
  const payload = await apiRequest<{ rules: ScheduleRule[] }>('/api/schedule-rules', { errorMessage: '스케줄 규칙을 불러오지 못했습니다.' });
  return payload.rules ?? [];
}

export async function saveScheduleRule(rule: Omit<ScheduleRule, 'id'> & { id?: string }) {
  const payload = await apiRequest<{ rule: ScheduleRule }>('/api/schedule-rules', {
    method: rule.id ? 'PUT' : 'POST', body: { rule }, errorMessage: '스케줄 규칙을 저장하지 못했습니다.',
  });
  return payload.rule;
}

export async function deleteScheduleRule(ruleId: string) {
  await apiRequest<{ ruleId: string }>('/api/schedule-rules', { method: 'DELETE', body: { ruleId }, errorMessage: '스케줄 규칙을 삭제하지 못했습니다.' });
}
