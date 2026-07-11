import type { AppAccount } from '../domain/types';
import { apiRequest } from './apiClient';

type AccountsPayload = {
  accounts?: AppAccount[];
};

export async function fetchAccounts(): Promise<AppAccount[]> {
  const payload = await apiRequest<AccountsPayload>('/api/accounts', {
    errorMessage: '계정 정보를 불러오지 못했습니다.',
  });

  return Array.isArray(payload.accounts) ? payload.accounts : [];
}

export async function saveAccount(account: AppAccount): Promise<AppAccount[]> {
  const payload = await apiRequest<AccountsPayload>('/api/accounts', {
    method: account.id ? 'PUT' : 'POST',
    body: { account },
    errorMessage: '계정 정보를 저장하지 못했습니다.',
  });

  return Array.isArray(payload.accounts) ? payload.accounts : [];
}
