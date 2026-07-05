import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { stores, weekdays } from '../../domain/data';
import { getStoreItemCount, getStoreName } from '../../domain/selectors';
import type {
  BaseShiftDraft,
  BaseShiftRule,
  Employee,
  EmployeeDraft,
  ShiftTemplate,
} from '../../domain/types';
import { templateById } from '../../utils/schedule';
import { StoreFilter } from '../common/StoreFilter';
import { Dropdown } from '../common/Dropdown';

type EmployeesViewProps = {
  employees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployee?: Employee;
  selectedBaseShifts: BaseShiftRule[];
  templates: ShiftTemplate[];
  storeId: string;
  storeFilter: string;
  showForm: boolean;
  editingEmployeeId: string | null;
  employeeDraft: EmployeeDraft;
  baseShiftDraft: BaseShiftDraft;
  isManager: boolean;
  setEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>>;
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  onStoreFilterChange: (storeId: string) => void;
  onStoreChange: (storeId: string) => void;
  onAddOpen: () => void;
  onEditOpen: (employee: Employee) => void;
  onFormClose: () => void;
  onEmployeeSave: (event: FormEvent<HTMLFormElement>) => void;
  onEmployeeDelete: (employee: Employee) => void;
  onEmployeeSelect: (employee: Employee) => void;
  onStoreToggle: (storeId: string) => void;
  onTemplateSelect: (templateId: string) => void;
  onBaseShiftAdd: (event: FormEvent<HTMLFormElement>) => void;
  onBaseShiftDelete: (ruleId: string) => void;
};

export function EmployeesView(props: EmployeesViewProps) {
  const { selectedEmployee, employeeDraft, baseShiftDraft } = props;

  return (
    <>
      <header className="employee-page-header">
        <div><h1>직원 관리</h1><p>직원 정보와 매장별 기본 근무 요일·시간을 관리합니다.</p></div>
        <button className="primary employee-add-button" type="button" onClick={props.onAddOpen}>+ 직원 추가</button>
      </header>
      <StoreFilter
        activeStoreId={props.storeFilter}
        totalCount={props.employees.length}
        ariaLabel="매장별 직원 필터"
        getCount={(storeId) =>
          getStoreItemCount(
            props.employees,
            storeId,
            (employee, id) => employee.storeIds.includes(id),
          )
        }
        onChange={props.onStoreFilterChange}
      />
      {props.showForm && props.isManager ? (
        <form className="employee-management-form" onSubmit={props.onEmployeeSave}>
          <div className="employee-form-heading"><div><h2>{props.editingEmployeeId ? '직원 정보 수정' : '새 직원 추가'}</h2><p>기본 인적 정보와 근무 가능한 매장을 설정합니다.</p></div><button type="button" onClick={props.onFormClose}>닫기</button></div>
          <div className="employee-form-fields">
            <label>이름<input value={employeeDraft.name} onChange={(event) => props.setEmployeeDraft((current) => ({ ...current, name: event.target.value }))} placeholder="직원 이름" required /></label>
            <label>근무 메모<input value={employeeDraft.preference} onChange={(event) => props.setEmployeeDraft((current) => ({ ...current, preference: event.target.value }))} placeholder="오픈 선호, 야간 고정 등" /></label>
            <label>표시 색상<input type="color" value={employeeDraft.color} onChange={(event) => props.setEmployeeDraft((current) => ({ ...current, color: event.target.value }))} /></label>
            <fieldset className="store-checklist"><legend>근무 매장 (다중 선택)</legend>{stores.map((store) => <label key={store.id}><input type="checkbox" checked={employeeDraft.storeIds.includes(store.id)} onChange={() => props.onStoreToggle(store.id)} /><span>{store.name}</span></label>)}</fieldset>
          </div>
          <div className="form-actions"><button type="button" onClick={props.onFormClose}>취소</button><button className="primary" type="submit" disabled={!employeeDraft.storeIds.length}>{props.editingEmployeeId ? '변경 저장' : '직원 추가'}</button></div>
        </form>
      ) : null}
      <div className="employee-management-layout">
        <section className="employee-card-grid" aria-label="직원 카드 목록">
          {props.filteredEmployees.map((employee) => (
            <article className={`management-employee-card ${selectedEmployee?.id === employee.id ? 'is-selected' : ''}`} key={employee.id} onClick={() => props.onEmployeeSelect(employee)}>
              <div className="management-card-heading"><span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span><div><strong>{employee.name}</strong><small>{employee.preference}</small></div></div>
              <div className="store-badges">{employee.storeIds.map((employeeStoreId) => <span key={employeeStoreId}>{getStoreName(employeeStoreId)}</span>)}</div>
              <div className="management-card-summary"><span>기본 근무</span><strong>{employee.baseShifts.length}건</strong></div>
              {props.isManager ? <div className="management-card-actions"><button type="button" onClick={(event) => { event.stopPropagation(); props.onEditOpen(employee); }}>정보 수정</button><button className="danger" type="button" onClick={(event) => { event.stopPropagation(); props.onEmployeeDelete(employee); }}>삭제</button></div> : null}
            </article>
          ))}
          {!props.filteredEmployees.length ? <p className="employee-page-empty">해당 매장에 등록된 직원이 없습니다.</p> : null}
        </section>
        {selectedEmployee ? (
          <aside className="employee-profile-panel">
            <div className="profile-heading"><span style={{ background: selectedEmployee.color }}>{selectedEmployee.name.slice(0, 1)}</span><div><h2>{selectedEmployee.name}</h2><p>{selectedEmployee.preference}</p></div></div>
            <div className="profile-store-selector"><strong>기본 근무정보 매장</strong><div>{selectedEmployee.storeIds.map((employeeStoreId) => <button type="button" className={props.storeId === employeeStoreId ? 'is-selected' : undefined} key={employeeStoreId} onClick={() => props.onStoreChange(employeeStoreId)}>{getStoreName(employeeStoreId)}</button>)}</div></div>
            <div className="base-shift-section">
              <div className="base-shift-title"><strong>요일별 기본 근무</strong><small>{getStoreName(props.storeId)} 기준</small></div>
              <div className="base-shift-list">
                {props.selectedBaseShifts.map((rule) => <div className="base-shift-item" key={rule.id}><span>{weekdays[rule.weekday]}요일</span><strong>{rule.startTime}-{rule.endTime}</strong><small>{templateById(rule.templateId, props.templates).label}</small>{props.isManager ? <button type="button" onClick={() => props.onBaseShiftDelete(rule.id)}>삭제</button> : null}</div>)}
                {!props.selectedBaseShifts.length ? <p>이 매장의 기본 근무정보가 없습니다.</p> : null}
              </div>
              {props.isManager ? (
                <form className="base-shift-form profile-base-form" onSubmit={props.onBaseShiftAdd}>
                  <label>요일<Dropdown value={String(baseShiftDraft.weekday)} options={weekdays.map((weekday, index) => ({ value: String(index), label: `${weekday}요일` }))} onChange={(weekday) => props.setBaseShiftDraft((current) => ({ ...current, weekday: Number(weekday) }))} /></label>
                  <label>근무 유형<Dropdown value={baseShiftDraft.templateId} options={props.templates.map((template) => ({ value: template.id, label: template.label }))} onChange={props.onTemplateSelect} /></label>
                  <label>시작 시간<input type="time" value={baseShiftDraft.startTime} onChange={(event) => props.setBaseShiftDraft((current) => ({ ...current, startTime: event.target.value }))} required /></label>
                  <label>종료 시간<input type="time" value={baseShiftDraft.endTime} onChange={(event) => props.setBaseShiftDraft((current) => ({ ...current, endTime: event.target.value }))} required /></label>
                  <button className="primary" type="submit">기본 근무 추가</button>
                </form>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </>
  );
}
