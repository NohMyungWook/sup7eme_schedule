export type Role = 'viewer' | 'manager';

export type ActiveView =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'notes'
  | 'settings';

export type SettingsPanel =
  | 'overview'
  | 'templates'
  | 'stores'
  | 'accounts';

export type Store = {
  id: string;
  name: string;
  address: string;
  phone: string;
  memo: string;
  isActive: boolean;
  color: string;
};

export type AccountRole = 'manager' | 'viewer';

export type AccountStatus = 'active' | 'inactive' | 'invited';

export type AccountPermissionAction = 'view' | 'create' | 'update' | 'delete';

export type AccountPermissionMenu =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'notes'
  | 'settings';

export type AccountPermissions = Record<
  AccountPermissionMenu,
  Record<AccountPermissionAction, boolean>
>;

export type AppAccount = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  storeIds: string[];
  permissions: AccountPermissions;
  lastSignedInAt: string | null;
  invitedAt: string | null;
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

export type ShiftTemplate = {
  id: string;
  label: string;
  time: string;
  color: string;
  requiresTimeInput?: boolean;
};

export type TemplateDraft = {
  label: string;
  startTime: string;
  endTime: string;
  color: string;
  requiresTimeInput: boolean;
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

export type PendingEmployeeDrop = {
  employeeId: string;
  date: string;
};

export type BaseShiftDraft = Omit<BaseShiftRule, 'id' | 'storeId' | 'weekday'> & {
  weekdays: number[];
};

export type ScheduleState = {
  stores: Store[];
  employees: Employee[];
  shifts: Shift[];
  notes: DayNote[];
  templates: ShiftTemplate[];
};
