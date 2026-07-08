import type { ActiveView, Role } from '../../domain/types';

type AppSidebarProps = {
  activeView: ActiveView;
  role: Role;
  displayName: string;
  onViewChange: (view: ActiveView) => void;
  onClose: () => void;
  onLogout: () => void;
};

export function AppSidebar({
  activeView,
  role,
  displayName,
  onViewChange,
  onClose,
  onLogout,
}: AppSidebarProps) {
  const isManager = role === 'manager';

  return (
    <aside className="sidebar" aria-label="스케줄 관리 메뉴">
      <div className="sidebar-heading">
        <div className="brand">
          <span className="brand-mark">S</span>
          <strong>KingMW</strong>
        </div>
        <button className="sidebar-toggle" type="button" aria-label="사이드바 닫기" onClick={onClose}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
        </button>
      </div>
      <nav className="nav-list">
        {isManager ? <button type="button" className={activeView === 'dashboard' ? 'is-active' : undefined} onClick={() => onViewChange('dashboard')}>대시보드</button> : null}
        <button type="button" className={activeView === 'schedule' ? 'is-active' : undefined} onClick={() => onViewChange('schedule')}>스케줄</button>
        {isManager ? (
          <>
            <button type="button" className={activeView === 'employees' ? 'is-active' : undefined} onClick={() => onViewChange('employees')}>직원</button>
            <button type="button" className={activeView === 'notes' ? 'is-active' : undefined} onClick={() => onViewChange('notes')}>메모</button>
            <button type="button" className={activeView === 'settings' ? 'is-active' : undefined} onClick={() => onViewChange('settings')}>설정</button>
          </>
        ) : null}
      </nav>
      <section className="session-panel">
        <div><span>{isManager ? '매니저' : '직원'}</span><strong>{displayName || (isManager ? '매니저' : '직원')}</strong></div>
        <button type="button" onClick={onLogout}>로그아웃</button>
      </section>
    </aside>
  );
}
