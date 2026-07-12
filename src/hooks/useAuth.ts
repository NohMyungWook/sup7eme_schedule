import { useEffect, useState, type FormEvent } from 'react';
import { defaultPermissionsForRole, normalizeAccountPermissions } from '../domain/permissions';
import type { AccountPermissions, Role } from '../domain/types';
import { loginToApi } from '../services/authApi';

const SESSION_KEY = 'sup7eme-session';

type StoredSession = {
  role: Role;
  displayName: string;
  permissions: AccountPermissions;
};

type UseAuthOptions = {
  onLogin: () => void;
  onLogout: () => void;
};

export function useAuth({ onLogin, onLogout }: UseAuthOptions) {
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [permissions, setPermissions] = useState<AccountPermissions>(() => defaultPermissionsForRole(null));
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const session = loadSession();
    setRole(session?.role ?? null);
    setDisplayName(session?.displayName ?? '');
    setPermissions(session?.permissions ?? defaultPermissionsForRole(session?.role ?? null));
    setIsAuthLoading(false);
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');

    let payload;
    try {
      payload = await loginToApi(loginId.trim(), loginPassword);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    if (!payload.user) {
      setLoginError(payload.message ?? '아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }

    const nextRole = payload.user.role;
    if (nextRole !== 'manager' && nextRole !== 'viewer') {
      setLoginError('앱 권한이 올바르지 않습니다.');
      return;
    }

    const nextSession = {
      role: nextRole,
      displayName: payload.user.displayName || payload.user.username,
      permissions: normalizeAccountPermissions(payload.user.permissions, nextRole),
    };

    saveSession(nextSession);
    setRole(nextSession.role);
    setDisplayName(nextSession.displayName);
    setPermissions(nextSession.permissions);
    setLoginPassword('');
    onLogin();
  }

  function logout() {
    clearSession();
    setRole(null);
    setDisplayName('');
    setPermissions(defaultPermissionsForRole(null));
    setLoginId('');
    setLoginPassword('');
    setLoginError('');
    onLogout();
  }

  return {
    role,
    displayName,
    permissions,
    loginId,
    setLoginId,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    isAuthLoading,
    login,
    logout,
  };
}

function loadSession(): StoredSession | null {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as StoredSession;
    if (parsed.role !== 'manager' && parsed.role !== 'viewer') return null;
    return {
      ...parsed,
      permissions: normalizeAccountPermissions(parsed.permissions, parsed.role),
    };
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
