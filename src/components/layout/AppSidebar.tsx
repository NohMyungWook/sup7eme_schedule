import type { ActiveView, Employee, Role } from '../../domain/types';

type AppSidebarProps = {
  activeView: ActiveView;
  role: Role;
  storeEmployees: Employee[];
  selectedEmployeeId?: string;
  onViewChange: (view: ActiveView) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onLogout: () => void;
};

export function AppSidebar({
  activeView,
  role,
  storeEmployees,
  selectedEmployeeId,
  onViewChange,
  onEmployeeSelect,
  onLogout,
}: AppSidebarProps) {
  const isManager = role === 'manager';

  return (
    <aside className="sidebar" aria-label="스케줄 관리 메뉴">
      <div className="brand">
        <span className="brand-mark">S</span>
        <strong>KingMW</strong>
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
      {activeView === 'schedule' && isManager ? (
        <section className="employee-panel" aria-labelledby="employee-title">
          <div className="panel-title"><h2 id="employee-title">현재 매장 직원</h2></div>
          <div className="employee-list">
            {storeEmployees.map((employee) => (
              <article
                className={`employee-card ${selectedEmployeeId === employee.id ? 'is-selected' : ''}`}
                draggable
                key={employee.id}
                onClick={() => onEmployeeSelect(employee.id)}
                onDragStart={(event) => event.dataTransfer.setData('application/x-kingmw-employee', employee.id)}
              >
                <span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span>
                <div><strong>{employee.name}</strong><small>{employee.preference}</small></div>
              </article>
            ))}
            {!storeEmployees.length ? <p className="empty-employees">직원 탭에서 이 매장 직원을 등록하세요.</p> : null}
          </div>
          <p className="drop-hint">직원 카드를 날짜 칸으로 드래그해서 근무를 추가</p>
        </section>
      ) : null}
      <section className="session-panel">
        <div><span>{isManager ? '매니저' : '직원'}</span><strong>{isManager ? 'admin' : 'redforce'}</strong></div>
        <button type="button" onClick={onLogout}>로그아웃</button>
      </section>
    </aside>
  );
}
