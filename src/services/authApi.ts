import type { AccountPermissions, Role } from '../domain/types';
import { apiRequest } from './apiClient';

type LoginPayload = {
  user?: {
    id: string;
    username: string;
    displayName?: string;
    role: Role;
    employeeId?: string | null;
    storeIds?: string[];
    mustChangePassword?: boolean;
    permissions?: Partial<AccountPermissions>;
  };
  message?: string;
};

export async function loginToApi(username: string, password: string) {
  return apiRequest<LoginPayload>('/api/login', {
    method: 'POST',
    body: { username, password },
    errorMessage: '아이디 또는 비밀번호가 올바르지 않습니다.',
  });
}

export async function fetchCurrentUser() {
  return apiRequest<LoginPayload>('/api/session', {
    errorMessage: '로그인 정보를 확인하지 못했습니다.',
  });
}

export async function changePassword(currentPassword: string, nextPassword: string) {
  return apiRequest<{ ok: boolean }>('/api/session', {
    method: 'PUT',
    body: { currentPassword, nextPassword },
    errorMessage: '비밀번호를 변경하지 못했습니다.',
  });
}

export async function logoutFromApi() {
  return apiRequest<{ ok?: boolean }>('/api/session', {
    method: 'DELETE',
    errorMessage: '로그아웃 처리 중 오류가 발생했습니다.',
  });
}
