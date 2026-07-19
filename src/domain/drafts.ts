import type {
  BaseShiftDraft,
  DraftShift,
  EmployeeDraft,
  TemplateDraft,
} from './types';

export function createInitialDraft(date: string): DraftShift {
  return {
    date,
    employeeId: '',
    templateId: '',
    time: '08:00-15:00',
    note: '',
  };
}

export function createInitialEmployeeDraft(
  storeId = '',
): EmployeeDraft {
  return {
    name: '',
    preference: '',
    color: '#dceeff',
    storeIds: storeId ? [storeId] : [],
  };
}

export function createInitialBaseShiftDraft(): BaseShiftDraft {
  return {
    weekdays: [1],
    templateId: '',
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
    requiresTimeInput: false,
  };
}
