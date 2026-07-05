export type Role = 'viewer' | 'manager';

export type ActiveView =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'notes'
  | 'settings';

export type Store = {
  id: string;
  name: string;
};

export type BaseShiftRule = {
  id: string;
  storeId: string;
  weekday: number;
  templateId: string;
  startTime: string;
  endTime: string;
};

export type Employee = {
  id: string;
  name: string;
  preference: string;
  color: string;
  storeIds: string[];
  baseShifts: BaseShiftRule[];
};

export type EmployeeDraft = Pick<
  Employee,
  'name' | 'preference' | 'color' | 'storeIds'
>;

export type TemplateColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'navy'
  | 'red';

export type ShiftTemplate = {
  id: string;
  label: string;
  time: string;
  color: TemplateColor;
  requiresTimeInput?: boolean;
};

export type TemplateDraft = {
  label: string;
  startTime: string;
  endTime: string;
  color: TemplateColor;
};

export type Shift = {
  id: string;
  storeId: string;
  date: string;
  employeeId: string;
  templateId: string;
  time: string;
  note?: string;
};

export type DayNote = {
  storeId: string;
  date: string;
  text: string;
};

export type DraftShift = Omit<Shift, 'id' | 'storeId'> & { note: string };

export type BaseShiftDraft = Omit<BaseShiftRule, 'id' | 'storeId'>;

export type ScheduleState = {
  employees: Employee[];
  shifts: Shift[];
  notes: DayNote[];
  templates: ShiftTemplate[];
};
