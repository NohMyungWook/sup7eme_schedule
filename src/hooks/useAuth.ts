import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { defaultPermissionsForRole, normalizeAccountPermissions } from '../domain/permissions';
import type { AccountPermissions, AuthUser, Role } from '../domain/types';
import { AUTH_EXPIRED_EVENT } from '../services/apiClient';
import { fetchCurrentUser, loginToApi, logoutFromApi } from '../services/authApi';

type UseAuthOptions = {
  onLogin: () => void;
  onLogout: () => void;
};

export function useAuth({ onLogin, onLogout }: UseAuthOptions) {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [permissions, setPermissions] = useState<AccountPermissions>(() => defaultPermissionsForRole(null));
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const resetAuthState = useCallback((message = '') => {
    setUser(null);
    setRole(null);
    setDisplayName('');
    setPermissions(defaultPermissionsForRole(null));
    setLoginId('');
    setLoginPassword('');
    setLoginError(message);
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    let mounted = true;
    fetchCurrentUser()
      .then((payload) => {
        if (!mounted || !payload.user) return;
        applyUser(payload.user);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setRole(null);
        setDisplayName('');
        setPermissions(defaultPermissionsForRole(null));
      })
      .finally(() => {
        if (mounted) setIsAuthLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      resetAuthState('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [resetAuthState]);

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
    if (!['manager', 'employee'].includes(nextRole)) {
      setLoginError('앱 권한이 올바르지 않습니다.');
      return;
    }

    const nextSession: AuthUser = {
      id: payload.user.id,
      username: payload.user.username,
      role: nextRole,
      displayName: payload.user.displayName || payload.user.username,
      employeeId: payload.user.employeeId ?? null,
      storeIds: payload.user.storeIds ?? [],
      mustChangePassword: Boolean(payload.user.mustChangePassword),
      permissions: normalizeAccountPermissions(payload.user.permissions, nextRole),
    };

    setUser(nextSession);
    setRole(nextSession.role);
    setDisplayName(nextSession.displayName);
    setPermissions(nextSession.permissions);
    setLoginPassword('');
    onLogin();
  }

  function logout() {
    void logoutFromApi().catch(() => undefined);
    resetAuthState();
  }

  function markPasswordChanged() {
    setUser((current) => current ? { ...current, mustChangePassword: false } : current);
  }

  return {
    user,
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
    markPasswordChanged,
  };

  function applyUser(payloadUser: NonNullable<Awaited<ReturnType<typeof fetchCurrentUser>>['user']>) {
    const nextRole = payloadUser.role;
    const nextUser: AuthUser = {
      id: payloadUser.id,
      username: payloadUser.username,
      displayName: payloadUser.displayName || payloadUser.username,
      role: nextRole,
      employeeId: payloadUser.employeeId ?? null,
      storeIds: payloadUser.storeIds ?? [],
      mustChangePassword: Boolean(payloadUser.mustChangePassword),
      permissions: normalizeAccountPermissions(payloadUser.permissions, nextRole),
    };
    setUser(nextUser);
    setRole(nextUser.role);
    setDisplayName(nextUser.displayName);
    setPermissions(nextUser.permissions);
  }
}
