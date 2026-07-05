import type { FormEvent } from 'react';

type LoginPageProps = {
  loginId: string;
  loginPassword: string;
  loginError: string;
  onLoginIdChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginPage({
  loginId,
  loginPassword,
  loginError,
  onLoginIdChange,
  onLoginPasswordChange,
  onSubmit,
}: LoginPageProps) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">S</span>
          <strong>KingMW</strong>
        </div>
        <div className="login-heading">
          <h1>로그인</h1>
          <p>계정 권한에 맞는 스케줄 화면으로 연결됩니다.</p>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            아이디
            <input
              autoComplete="username"
              value={loginId}
              onChange={(event) => onLoginIdChange(event.target.value)}
              placeholder="아이디 입력"
              required
            />
          </label>
          <label>
            비밀번호
            <input
              autoComplete="current-password"
              type="password"
              value={loginPassword}
              onChange={(event) => onLoginPasswordChange(event.target.value)}
              placeholder="비밀번호 입력"
              required
            />
          </label>
          {loginError ? <p className="login-error" role="alert">{loginError}</p> : null}
          <button className="primary" type="submit">로그인</button>
        </form>
      </section>
    </main>
  );
}
