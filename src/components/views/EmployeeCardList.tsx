import { getStoreName } from '../../domain/selectors';
import type { Employee, Store } from '../../domain/types';

type EmployeeCardListProps = {
  filteredEmployees: Employee[];
  isAddingEmployee: boolean;
  selectedEmployee?: Employee;
  stores: Store[];
  onEmployeeSelect: (employee: Employee) => void;
  isReorderMode: boolean;
  onOrderChange: (employees: Employee[]) => void;
};

export function EmployeeCardList({
  filteredEmployees,
  isAddingEmployee,
  selectedEmployee,
  stores,
  onEmployeeSelect,
  isReorderMode,
  onOrderChange,
}: EmployeeCardListProps) {
  function moveEmployee(employeeId: string, direction: -1 | 1) {
    const fromIndex = filteredEmployees.findIndex((employee) => employee.id === employeeId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= filteredEmployees.length) return;
    const nextEmployees = [...filteredEmployees];
    const [movedEmployee] = nextEmployees.splice(fromIndex, 1);
    nextEmployees.splice(toIndex, 0, movedEmployee);
    onOrderChange(nextEmployees);
  }

  function moveEmployeeTo(employeeId: string, targetId: string) {
    if (employeeId === targetId) return;
    const fromIndex = filteredEmployees.findIndex((employee) => employee.id === employeeId);
    const toIndex = filteredEmployees.findIndex((employee) => employee.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextEmployees = [...filteredEmployees];
    const [movedEmployee] = nextEmployees.splice(fromIndex, 1);
    nextEmployees.splice(toIndex, 0, movedEmployee);
    onOrderChange(nextEmployees);
  }

  return (
    <section className="employee-card-grid" aria-label="직원 카드 목록">
      {filteredEmployees.map((employee) => (
        <article
          className={`management-employee-card ${employee.isActive === false || employee.employmentStatus !== 'active' ? 'is-inactive' : ''} ${
            !isAddingEmployee && selectedEmployee?.id === employee.id ? 'is-selected' : ''
          } ${isReorderMode ? 'is-reordering' : ''}`}
          draggable={isReorderMode}
          key={employee.id}
          onClick={() => { if (!isReorderMode) onEmployeeSelect(employee); }}
          onDragStart={(event) => event.dataTransfer.setData('application/x-kingmw-managed-employee', employee.id)}
          onDragOver={(event) => { if (isReorderMode) event.preventDefault(); }}
          onDrop={(event) => {
            if (!isReorderMode) return;
            event.preventDefault();
            moveEmployeeTo(event.dataTransfer.getData('application/x-kingmw-managed-employee'), employee.id);
          }}
        >
          {isReorderMode ? <div className="employee-order-controls"><span aria-hidden="true">⠿</span><button type="button" onClick={() => moveEmployee(employee.id, -1)} disabled={filteredEmployees[0]?.id === employee.id} aria-label={`${employee.name} 위로 이동`}>↑</button><button type="button" onClick={() => moveEmployee(employee.id, 1)} disabled={filteredEmployees.at(-1)?.id === employee.id} aria-label={`${employee.name} 아래로 이동`}>↓</button></div> : null}
          <div className="management-card-heading">
            <span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span>
            <div>
              <strong>{employee.name}</strong>
              {employee.isActive === false || employee.employmentStatus !== 'active' ? <em>비활성</em> : null}
              {employee.preference ? <small>{employee.preference}</small> : null}
            </div>
          </div>
          <div className="store-badges">
            {employee.storeIds.map((employeeStoreId) => (
              <span key={employeeStoreId}>{getStoreName(employeeStoreId, stores)}</span>
            ))}
          </div>
          <div className="management-card-summary">
            <span>기본 근무</span>
            <strong>{employee.baseShifts.length}건</strong>
          </div>
        </article>
      ))}
      {!filteredEmployees.length ? (
        <p className="employee-page-empty">해당 매장에 등록된 직원이 없습니다.</p>
      ) : null}
    </section>
  );
}
