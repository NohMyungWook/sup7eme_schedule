import type {
  AccountPermissionAction,
  AccountPermissionMenu,
  AccountRole,
  AccountStatus,
  AppAccount,
  Store,
} from '../../domain/types';
import { clonePermissions, defaultManagerPermissions } from '../../domain/permissions';

export type AccountDraft = AppAccount & {
  password?: string;
};

export const accountMenus: Array<{
  id: AccountPermissionMenu;
  label: string;
  icon: 'monitor' | 'calendar' | 'users' | 'bell' | 'shield';
}> = [
  { id: 'dashboard', label: '대시보드', icon: 'monitor' },
  { id: 'schedule', label: '스케줄', icon: 'calendar' },
  { id: 'employees', label: '직원', icon: 'users' },
  { id: 'notes', label: '메모', icon: 'bell' },
  { id: 'settings', label: '설정', icon: 'shield' },
];

export const accountActions: Array<{ id: AccountPermissionAction; label: string }> = [
  { id: 'view', label: '보기' },
  { id: 'create', label: '추가' },
  { id: 'update', label: '수정' },
  { id: 'delete', label: '삭제' },
];

export const roleLabels: Record<AccountRole, string> = {
  manager: '관리자',
  viewer: '조회 전용',
};

export const statusLabels: Record<AccountStatus, string> = {
  active: '활성',
  inactive: '비활성',
  invited: '초대 대기',
};

export function createAccountDraft(
  account?: AppAccount,
  stores: Store[] = [],
): AccountDraft {
  return account
    ? {
      ...account,
      storeIds: [...account.storeIds],
      permissions: clonePermissions(account.permissions),
    }
    : {
      id: '',
      username: '',
      displayName: '',
      email: '',
      role: 'manager',
      status: 'invited',
      storeIds: stores.length ? [] : [],
      permissions: clonePermissions(defaultManagerPermissions),
      lastSignedInAt: null,
      invitedAt: null,
      password: '',
    };
}

export function getStoreSummary(storeIds: string[], stores: Store[]) {
  if (!storeIds.length) return '전체 매장';
  const names = storeIds.map(
    (storeId) => stores.find((store) => store.id === storeId)?.name ?? storeId,
  );
  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}`
    : names.join(', ');
}

export function formatRelative(value: string | null) {
  if (!value) return '접속 기록 없음';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
