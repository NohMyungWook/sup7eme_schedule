import { useState, type FormEvent } from 'react';
import { changePassword } from '../../services/authApi';

export function PasswordChangeGate({ displayName, onChanged, onLogout }: { displayName: string; onChanged: () => void; onLogout: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nextPassword !== confirmPassword) { setMessage('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setIsSaving(true); setMessage('');
    try { await changePassword(currentPassword, nextPassword); onChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.'); }
    finally { setIsSaving(false); }
  }
  return <main className="login-page"><section className="login-panel password-change-panel"><div className="login-heading"><span>KingMW</span><h1>비밀번호를 변경해주세요.</h1><p>{displayName}님의 임시 비밀번호는 최초 로그인 후 변경해야 합니다.</p></div><form onSubmit={submit}><label>현재 비밀번호<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>새 비밀번호<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} required /></label><label>새 비밀번호 확인<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>{message ? <p className="login-error">{message}</p> : null}<button type="submit" disabled={isSaving}>{isSaving ? '변경 중...' : '비밀번호 변경'}</button><button className="secondary" type="button" onClick={onLogout}>로그아웃</button></form></section></main>;
}
