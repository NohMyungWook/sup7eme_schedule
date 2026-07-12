import type { AccountPermissions, Role } from '../domain/types';
import { apiRequest } from './apiClient';

type LoginPayload = {
  user?: {
    username: string;
    displayName?: string;
    role: Role;
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
