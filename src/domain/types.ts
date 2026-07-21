export type Role = 'manager' | 'employee';

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
  | 'accounts'
  | 'leave-requests'
  | 'rules';

export type Store = {
  id: string;
  name: string;
  address: string;
  phone: string;
  memo: string;
  isActive: boolean;
  color: string;
  employeeCount?: number;
  baseShiftCount?: number;
  scheduleCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountRole = Role;

export type AccountStatus = 'active' | 'inactive';

export type AccountPermissionAction = 'view' | 'create' | 'update' | 'delete';

export type AccountPermissionMenu =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'notes'
  | 'settings'
  | 'leaveRequests'
  | 'accounts';

export type AccountPermissions = Record<
  AccountPermissionMenu,
  Record<AccountPermissionAction, boolean>
>;

export type AppAccount = {
  id: string;
  username: string;
  displayName: string;
  role: AccountRole;
  status: AccountStatus;
  employeeId: string | null;
  employeeName?: string | null;
  storeIds: string[];
  permissions: AccountPermissions;
  lastSignedInAt: string | null;
  mustChangePassword: boolean;
};

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  employeeId: string | null;
  storeIds: string[];
  mustChangePassword: boolean;
  permissions: AccountPermissions;
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
  isActive?: boolean;
  employmentStatus?: 'active' | 'inactive' | 'terminated';
  accountId?: string | null;
  username?: string | null;
  accountStatus?: AccountStatus | null;
  createdAt?: string;
  updatedAt?: string;
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
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  baseShiftCount?: number;
  scheduleCount?: number;
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
  status?: 'scheduled' | 'cancelled';
  updatedAt?: string;
  storeName?: string;
  employeeName?: string;
  templateLabel?: string;
  templateColor?: string;
  dayNote?: string;
  hasLeaveConflict?: boolean;
  leaveConflictStatus?: 'pending' | 'approved' | null;
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  targetDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  status: LeaveRequestStatus;
  decisionReason: string;
  processedByName: string | null;
  processedAt: string | null;
  hasScheduleConflict: boolean;
  createdAt: string;
  updatedAt: string;
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
