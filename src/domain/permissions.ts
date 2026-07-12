import type {
  AccountPermissionAction,
  AccountPermissionMenu,
  AccountPermissions,
  Role,
} from './types';

export const defaultManagerPermissions: AccountPermissions = {
  dashboard: { view: true, create: true, update: true, delete: true },
  schedule: { view: true, create: true, update: true, delete: true },
  employees: { view: true, create: true, update: true, delete: true },
  notes: { view: true, create: true, update: true, delete: true },
  settings: { view: true, create: true, update: true, delete: true },
};

export const defaultViewerPermissions: AccountPermissions = {
  dashboard: { view: false, create: false, update: false, delete: false },
  schedule: { view: true, create: false, update: false, delete: false },
  employees: { view: false, create: false, update: false, delete: false },
  notes: { view: false, create: false, update: false, delete: false },
  settings: { view: false, create: false, update: false, delete: false },
};

export function defaultPermissionsForRole(role: Role | null): AccountPermissions {
  return role === 'manager' ? clonePermissions(defaultManagerPermissions) : clonePermissions(defaultViewerPermissions);
}

export function normalizeAccountPermissions(
  permissions: Partial<AccountPermissions> | null | undefined,
  role: Role | null = 'manager',
): AccountPermissions {
  const base = defaultPermissionsForRole(role);
  if (!permissions || typeof permissions !== 'object') return base;

  Object.keys(base).forEach((menu) => {
    Object.keys(base[menu as AccountPermissionMenu]).forEach((action) => {
      base[menu as AccountPermissionMenu][action as AccountPermissionAction] =
        Boolean(permissions[menu as AccountPermissionMenu]?.[action as AccountPermissionAction]);
    });
  });

  return base;
}

export function hasPermission(
  permissions: AccountPermissions,
  menu: AccountPermissionMenu,
  action: AccountPermissionAction,
) {
  return Boolean(permissions[menu]?.[action]);
}

export function clonePermissions(permissions: AccountPermissions): AccountPermissions {
  return JSON.parse(JSON.stringify(permissions)) as AccountPermissions;
}
