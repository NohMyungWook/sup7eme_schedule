import type { AppAccount } from '../domain/types';
import { apiRequest } from './apiClient';

type AccountsPayload = {
  accounts?: AppAccount[];
  initialPassword?: string;
};

export async function fetchAccounts(): Promise<AppAccount[]> {
  const payload = await apiRequest<AccountsPayload>('/api/accounts', {
    errorMessage: '계정 정보를 불러오지 못했습니다.',
  });

  return Array.isArray(payload.accounts) ? payload.accounts : [];
}

export async function saveAccount(account: AppAccount & { password?: string }) {
  const payload = await apiRequest<AccountsPayload>('/api/accounts', {
    method: account.id ? 'PUT' : 'POST',
    body: { account },
    errorMessage: '계정 정보를 저장하지 못했습니다.',
  });

  return {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    initialPassword: payload.initialPassword ?? null,
  };
}

export async function resetAccountPassword(accountId: string) {
  const payload = await apiRequest<AccountsPayload>('/api/accounts', {
    method: 'PATCH',
    body: { action: 'reset-password', accountId },
    errorMessage: '비밀번호를 초기화하지 못했습니다.',
  });
  return {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    initialPassword: payload.initialPassword ?? null,
  };
}

export async function deleteAccount(accountId: string) {
  const payload = await apiRequest<AccountsPayload & { employeeId?: string | null }>('/api/accounts', {
    method: 'DELETE',
    body: { accountId },
    errorMessage: '계정을 삭제하지 못했습니다.',
  });
  return {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    employeeId: payload.employeeId ?? null,
  };
}
