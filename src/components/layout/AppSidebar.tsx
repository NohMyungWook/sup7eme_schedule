import type { ActiveView } from '../../domain/types';

type AppSidebarProps = {
  activeView: ActiveView;
  canView: Record<ActiveView, boolean>;
  onViewChange: (view: ActiveView) => void;
  onClose: () => void;
};

export function AppSidebar({
  activeView,
  canView,
  onViewChange,
  onClose,
}: AppSidebarProps) {
  const navItems: Array<{ view: ActiveView; label: string; icon: SidebarIconName }> = [
    { view: 'dashboard', label: '대시보드', icon: 'dashboard' },
    { view: 'schedule', label: '스케줄', icon: 'schedule' },
    { view: 'employees', label: '직원', icon: 'employees' },
    { view: 'notes', label: '메모', icon: 'notes' },
    { view: 'settings', label: '설정', icon: 'settings' },
  ];

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
        {navItems
          .filter((item) => canView[item.view])
          .map((item) => (
            <button
              type="button"
              className={activeView === item.view ? 'is-active' : undefined}
              key={item.view}
              onClick={() => onViewChange(item.view)}
            >
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
      </nav>
    </aside>
  );
}

type SidebarIconName = 'dashboard' | 'schedule' | 'employees' | 'notes' | 'settings';

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const paths = {
    dashboard: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10.5V20h11v-9.5" /><path d="M10 20v-5h4v5" /><path d="M15 8.5V5h3v6" /></>,
    schedule: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M8 14h3M13 14h3M8 17h3" /></>,
    employees: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 11a3 3 0 0 1 0 6" /><path d="M17 8a2.5 2.5 0 0 1 0 5" /></>,
    notes: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04A1.8 1.8 0 0 0 14.8 19.6a1.8 1.8 0 0 0-1.1 1.65V21.4a2.1 2.1 0 0 1-4.2 0v-.06A1.8 1.8 0 0 0 8.4 19.7a1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 0 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.8 15.1a1.8 1.8 0 0 0-1.65-1.1H2.1a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.8 8.7a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 0 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 8.4 4.1a1.8 1.8 0 0 0 1.1-1.65V2.4a2.1 2.1 0 0 1 4.2 0v.06A1.8 1.8 0 0 0 14.8 4.1a1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8.7a1.8 1.8 0 0 0 1.65 1.1h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" /></>,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>;
}
