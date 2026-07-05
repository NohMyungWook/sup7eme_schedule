import { useState, type FormEvent } from 'react';
import type { Role } from '../domain/types';
import {
  clearSessionRole,
  loadSessionRole,
  saveSessionRole,
} from '../services/scheduleStorage';

type UseAuthOptions = {
  onLogin: () => void;
  onLogout: () => void;
};

export function useAuth({ onLogin, onLogout }: UseAuthOptions) {
  const [role, setRole] = useState<Role | null>(loadSessionRole);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRole = resolveRole(loginId, loginPassword);

    if (!nextRole) {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    saveSessionRole(nextRole);
    setRole(nextRole);
    setLoginPassword('');
    setLoginError('');
    onLogin();
  }

  function logout() {
    clearSessionRole();
    setRole(null);
    setLoginId('');
    setLoginPassword('');
    setLoginError('');
    onLogout();
  }

  return {
    role,
    loginId,
    setLoginId,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    login,
    logout,
  };
}

function resolveRole(loginId: string, password: string): Role | null {
  if (loginId === 'admin' && password === 'admin') return 'manager';
  if (loginId === 'redforce' && password === '1234') return 'viewer';
  return null;
}
