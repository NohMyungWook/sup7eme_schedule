import { useMemo, useState } from 'react';
import type { Employee } from '../../domain/types';

type ScheduleEmployeePoolProps = {
  employees: Employee[];
  selectedEmployeeId?: string;
  onEmployeeSelect: (employeeId: string) => void;
  onTouchDragStart?: (employeeId: string) => void;
  onTouchDragEnd?: (touch: { clientX: number; clientY: number }) => void;
};

export function ScheduleEmployeePool({
  employees,
  selectedEmployeeId,
  onEmployeeSelect,
  onTouchDragStart,
  onTouchDragEnd,
}: ScheduleEmployeePoolProps) {
  const [employeeSearch, setEmployeeSearch] = useState('');
  const filteredEmployees = useMemo(() => {
    const keyword = employeeSearch.trim().toLowerCase();
    if (!keyword) return employees;

    return employees.filter((employee) => employee.name.toLowerCase().includes(keyword));
  }, [employeeSearch, employees]);

  return (
    <section className="schedule-bottom-panel" aria-labelledby="schedule-employee-title">
      <div className="schedule-bottom-main">
        <div className="schedule-bottom-toolbar">
          <h2 id="schedule-employee-title">현재 매장 직원 <strong>{filteredEmployees.length}</strong></h2>
          <label>
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
            <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="직원 검색" />
          </label>
          <span className="schedule-drag-guide">드래그하여 날짜 칸에 배정하세요 <i>ⓘ</i></span>
        </div>
        <div className="schedule-employee-list">
          {filteredEmployees.map((employee) => (
            <button
              type="button"
              className={`employee-card schedule-pool-card ${selectedEmployeeId === employee.id ? 'is-selected' : ''}`}
              draggable
              key={employee.id}
              onClick={() => onEmployeeSelect(employee.id)}
              aria-label={`${employee.name} 직원 선택`}
              aria-pressed={selectedEmployeeId === employee.id}
              onDragStart={(event) => event.dataTransfer.setData('application/x-kingmw-employee', employee.id)}
              onTouchStart={() => onTouchDragStart?.(employee.id)}
              onTouchEnd={(event) => {
                const touch = event.changedTouches[0];
                if (touch) onTouchDragEnd?.(touch);
              }}
            >
              <span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span>
              <div><strong>{employee.name}</strong></div>
            </button>
          ))}
          {!filteredEmployees.length ? <p className="empty-employees">조건에 맞는 직원이 없습니다.</p> : null}
        </div>
      </div>
    </section>
  );
}
