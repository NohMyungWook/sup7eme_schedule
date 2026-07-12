import { stores as fallbackStores } from '../domain/data';
import type { ScheduleState } from '../domain/types';
import { apiRequest } from './apiClient';

type SchedulePayload = {
  state?: Partial<ScheduleState>;
};

export async function fetchScheduleState(): Promise<ScheduleState> {
  const payload = await apiRequest<SchedulePayload>('/api/schedule', {
    errorMessage: '스케줄 정보를 불러오지 못했습니다.',
  });

  return normalizeScheduleState(payload.state);
}

export async function saveScheduleStateToApi(state: ScheduleState) {
  const payload = await apiRequest<SchedulePayload>('/api/schedule', {
    method: 'PUT',
    body: { state },
    errorMessage: '스케줄 정보를 저장하지 못했습니다.',
  });

  return normalizeScheduleState(payload.state);
}

function normalizeScheduleState(state: Partial<ScheduleState> | undefined): ScheduleState {
  const stores = Array.isArray(state?.stores) && state.stores.length
    ? state.stores
    : fallbackStores;

  return {
    stores: stores.map((store) => ({
      id: String(store.id),
      name: store.name || '이름 없음',
      address: store.address ?? '',
      phone: store.phone ?? '',
      memo: store.memo ?? '',
      isActive: store.isActive !== false,
      color: store.color || 'purple',
    })),
    employees: Array.isArray(state?.employees)
      ? state.employees.map((employee) => ({
        ...employee,
        preference: employee.preference ?? '',
        color: employee.color ?? '#dceeff',
        storeIds: Array.isArray(employee.storeIds) ? employee.storeIds : [],
        baseShifts: Array.isArray(employee.baseShifts) ? employee.baseShifts : [],
      }))
      : [],
    shifts: Array.isArray(state?.shifts) ? state.shifts : [],
    notes: Array.isArray(state?.notes) ? state.notes : [],
    templates: Array.isArray(state?.templates)
      ? state.templates.map((template) => ({
        ...template,
        label: template.label || '근무',
        time: template.time || '08:00-15:00',
        color: template.color || 'blue',
        requiresTimeInput: Boolean(template.requiresTimeInput),
      }))
      : [],
  };
}
