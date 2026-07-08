import { useEffect, useState, type FormEvent } from 'react';
import type { Role } from '../domain/types';

const SESSION_KEY = 'sup7eme-session';

type StoredSession = {
  role: Role;
  displayName: string;
};

type UseAuthOptions = {
  onLogin: () => void;
  onLogout: () => void;
};

export function useAuth({ onLogin, onLogout }: UseAuthOptions) {
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const session = loadSession();
    setRole(session?.role ?? null);
    setDisplayName(session?.displayName ?? '');
    setIsAuthLoading(false);
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginId.trim(),
        password: loginPassword,
      }),
    });
    const payload = await parseJson(response);

    if (!response.ok || !payload.user) {
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
    };

    saveSession(nextSession);
    setRole(nextSession.role);
    setDisplayName(nextSession.displayName);
    setLoginPassword('');
    onLogin();
  }

  function logout() {
    clearSession();
    setRole(null);
    setDisplayName('');
    setLoginId('');
    setLoginPassword('');
    setLoginError('');
    onLogout();
  }

  return {
    role,
    displayName,
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
    return parsed.role === 'manager' || parsed.role === 'viewer' ? parsed : null;
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

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
