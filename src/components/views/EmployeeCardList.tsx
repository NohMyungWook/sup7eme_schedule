import { getStoreName } from '../../domain/selectors';
import type { Employee, Store } from '../../domain/types';

type EmployeeCardListProps = {
  filteredEmployees: Employee[];
  isAddingEmployee: boolean;
  selectedEmployee?: Employee;
  stores: Store[];
  onEmployeeSelect: (employee: Employee) => void;
};

export function EmployeeCardList({
  filteredEmployees,
  isAddingEmployee,
  selectedEmployee,
  stores,
  onEmployeeSelect,
}: EmployeeCardListProps) {
  return (
    <section className="employee-card-grid" aria-label="직원 카드 목록">
      {filteredEmployees.map((employee) => (
        <article
          className={`management-employee-card ${
            !isAddingEmployee && selectedEmployee?.id === employee.id ? 'is-selected' : ''
          }`}
          key={employee.id}
          onClick={() => onEmployeeSelect(employee)}
        >
          <div className="management-card-heading">
            <span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span>
            <div>
              <strong>{employee.name}</strong>
              <small>{employee.preference}</small>
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
