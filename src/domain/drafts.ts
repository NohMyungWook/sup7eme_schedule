import { initialEmployees, initialTemplates, stores } from './data';
import type {
  BaseShiftDraft,
  DraftShift,
  EmployeeDraft,
  TemplateDraft,
} from './types';

export function createInitialDraft(date: string): DraftShift {
  return {
    date,
    employeeId: initialEmployees[0].id,
    templateId: initialTemplates[0].id,
    time: initialTemplates[0].time,
    note: '',
  };
}

export function createInitialEmployeeDraft(
  storeId = stores[0].id,
): EmployeeDraft {
  return {
    name: '',
    preference: '',
    color: '#dceeff',
    storeIds: [storeId],
  };
}

export function createInitialBaseShiftDraft(): BaseShiftDraft {
  return {
    weekday: 1,
    templateId: initialTemplates[0].id,
    startTime: '08:00',
    endTime: '15:00',
  };
}

export function createInitialTemplateDraft(): TemplateDraft {
  return {
    label: '',
    startTime: '08:00',
    endTime: '15:00',
    color: 'blue',
  };
}
