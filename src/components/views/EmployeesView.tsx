import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { stores, weekdays } from '../../domain/data';
import { getStoreItemCount, getStoreName } from '../../domain/selectors';
import type {
  BaseShiftDraft,
  BaseShiftRule,
  Employee,
  EmployeeDraft,
} from '../../domain/types';
import { StoreFilter } from '../common/StoreFilter';
import { Dropdown } from '../common/Dropdown';
import { TimePicker } from '../common/TimePicker';

const profileColorOptions = ['#ddd6fe', '#f9a8d4', '#fdba74', '#fde68a', '#93c5fd'];
const baseShiftTypes = [
  { value: 'open', label: '오전', startTime: '08:00', endTime: '15:00' },
  { value: 'middle', label: '오후', startTime: '15:00', endTime: '22:00' },
  { value: 'night', label: '야간', startTime: '22:00', endTime: '08:00' },
  { value: 'custom', label: '직접 입력', startTime: '00:00', endTime: '00:00' },
];

function baseShiftTypeLabel(templateId: string) {
  if (templateId === 'open') return '오전';
  if (templateId === 'middle' || templateId === 'evening') return '오후';
  if (templateId === 'night' || templateId === 'sub') return '야간';
  if (templateId === 'custom') return '직접 입력';
  return '직접 입력';
}

type EmployeesViewProps = {
  employees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployee?: Employee;
  selectedBaseShifts: BaseShiftRule[];
  storeId: string;
  storeFilter: string;
  showForm: boolean;
  employeeDraft: EmployeeDraft;
  selectedEmployeeDraft: EmployeeDraft;
  baseShiftDraft: BaseShiftDraft;
  isManager: boolean;
  setEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>>;
  setSelectedEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>>;
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  onStoreFilterChange: (storeId: string) => void;
  onStoreChange: (storeId: string) => void;
  onAddOpen: () => void;
  onFormClose: () => void;
  onEmployeeSave: (event: FormEvent<HTMLFormElement>) => void;
  onSelectedEmployeeSave: (event: FormEvent<HTMLFormElement>) => void;
  onEmployeeDelete: (employee: Employee) => void;
  onEmployeeSelect: (employee: Employee) => void;
  onStoreToggle: (storeId: string) => void;
  onSelectedStoreToggle: (storeId: string) => void;
  onBaseShiftWeekdayToggle: (weekday: number) => void;
  onTemplateSelect: (templateId: string) => void;
  onBaseShiftAdd: (event: FormEvent<HTMLFormElement>) => void;
  onBaseShiftDelete: (ruleIds: string | string[]) => void;
};

export function EmployeesView(props: EmployeesViewProps) {
  const { selectedEmployee, employeeDraft, selectedEmployeeDraft, baseShiftDraft, onStoreChange, storeId } = props;
  const [isNameEditing, setIsNameEditing] = useState(false);
  const isAddingEmployee = props.showForm;
  const activeEmployeeDraft = isAddingEmployee ? employeeDraft : selectedEmployeeDraft;
  const setActiveEmployeeDraft = isAddingEmployee ? props.setEmployeeDraft : props.setSelectedEmployeeDraft;
  const toggleActiveStore = isAddingEmployee ? props.onStoreToggle : props.onSelectedStoreToggle;
  const selectedEmployeeId = selectedEmployee?.id;
  const baseStoreOptions = selectedEmployeeDraft.storeIds.map((employeeStoreId) => ({
    value: employeeStoreId,
    label: getStoreName(employeeStoreId),
  }));
  const activeBaseStoreId = selectedEmployeeDraft.storeIds.includes(storeId)
    ? storeId
    : selectedEmployeeDraft.storeIds[0] ?? storeId;

  useEffect(() => {
    setIsNameEditing(isAddingEmployee);
  }, [isAddingEmployee, selectedEmployeeId]);

  useEffect(() => {
    if (isAddingEmployee || !selectedEmployeeId || !selectedEmployeeDraft.storeIds.length) return;
    if (!selectedEmployeeDraft.storeIds.includes(storeId)) {
      onStoreChange(selectedEmployeeDraft.storeIds[0]);
    }
  }, [isAddingEmployee, onStoreChange, selectedEmployeeDraft.storeIds, selectedEmployeeId, storeId]);

  const groupedBaseShifts = props.selectedBaseShifts.reduce<Array<{ key: string; ruleIds: string[]; weekdays: number[]; templateId: string; startTime: string; endTime: string }>>((groups, rule) => {
    const key = `${rule.templateId}-${rule.startTime}-${rule.endTime}`;
    const group = groups.find((item) => item.key === key);
    if (group) {
      group.ruleIds.push(rule.id);
      group.weekdays.push(rule.weekday);
    } else {
      groups.push({ key, ruleIds: [rule.id], weekdays: [rule.weekday], templateId: rule.templateId, startTime: rule.startTime, endTime: rule.endTime });
    }
    return groups;
  }, []).map((group) => ({ ...group, weekdays: [...group.weekdays].sort((a, b) => a - b) }));

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
      <div className="employee-management-layout">
        <section className="employee-card-grid" aria-label="직원 카드 목록">
          {props.filteredEmployees.map((employee) => (
            <article className={`management-employee-card ${!isAddingEmployee && selectedEmployee?.id === employee.id ? 'is-selected' : ''}`} key={employee.id} onClick={() => props.onEmployeeSelect(employee)}>
              <div className="management-card-heading"><span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span><div><strong>{employee.name}</strong><small>{employee.preference}</small></div></div>
              <div className="store-badges">{employee.storeIds.map((employeeStoreId) => <span key={employeeStoreId}>{getStoreName(employeeStoreId)}</span>)}</div>
              <div className="management-card-summary"><span>기본 근무</span><strong>{employee.baseShifts.length}건</strong></div>
            </article>
          ))}
          {!props.filteredEmployees.length ? <p className="employee-page-empty">해당 매장에 등록된 직원이 없습니다.</p> : null}
        </section>
        {selectedEmployee || isAddingEmployee ? (
          <aside className="employee-profile-panel">
            <div className="profile-heading">
              <span style={{ background: activeEmployeeDraft.color }}>{activeEmployeeDraft.name.slice(0, 1) || '?'}</span>
              <div>
                <div className="profile-name-row">
                  {isNameEditing ? <input value={activeEmployeeDraft.name} onChange={(event) => setActiveEmployeeDraft((current) => ({ ...current, name: event.target.value }))} placeholder="직원 이름" form="selected-employee-form" required /> : <h2>{activeEmployeeDraft.name || '새 직원'}</h2>}
                  {props.isManager && !isAddingEmployee ? <button type="button" className={`profile-name-edit-button ${isNameEditing ? 'is-confirm' : ''}`} aria-label={isNameEditing ? '직원 이름 수정 완료' : '직원 이름 수정'} onClick={() => setIsNameEditing((current) => !current)}>{isNameEditing ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.5 4 4 8-9" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.7 3.3a1.8 1.8 0 0 1 2.5 2.5L6.9 15.1l-3.4.8.8-3.4 9.4-9.2Z" /><path d="m12.5 4.5 3 3" /></svg>}</button> : null}
                </div>
                <p><span>{activeEmployeeDraft.preference || '직원 메모 없음'}</span><b>{activeEmployeeDraft.storeIds.length}개 매장 가능</b></p>
              </div>
            </div>
            {props.isManager ? (
              <form id="selected-employee-form" className="profile-edit-form" onSubmit={isAddingEmployee ? props.onEmployeeSave : props.onSelectedEmployeeSave}>
                <div className="profile-edit-title"><strong>기본 정보</strong></div>
                <div className="profile-edit-fields">
                  <label>직원 메모<input value={activeEmployeeDraft.preference} onChange={(event) => setActiveEmployeeDraft((current) => ({ ...current, preference: event.target.value }))} placeholder="오픈 선호, 야간 고정 등" /></label>
                  <div className="profile-color-field"><span>표시 색상</span><div>{profileColorOptions.map((color) => <button type="button" className={activeEmployeeDraft.color === color ? 'is-selected' : undefined} key={color} style={{ background: color }} aria-label={`${color} 색상 선택`} onClick={() => setActiveEmployeeDraft((current) => ({ ...current, color }))} />)}<label className="profile-rainbow-color" aria-label="직접 RGB 색상 선택"><input type="color" value={activeEmployeeDraft.color} onChange={(event) => setActiveEmployeeDraft((current) => ({ ...current, color: event.target.value }))} /></label></div></div>
                </div>
              </form>
            ) : null}
            {props.isManager ? (
              <div className="profile-store-selector profile-store-editor"><strong>근무 가능 매장</strong><small>선택한 매장에서 근무가 가능합니다.</small><div>{stores.map((store) => <button type="button" className={activeEmployeeDraft.storeIds.includes(store.id) ? 'is-selected' : undefined} key={store.id} onClick={() => toggleActiveStore(store.id)}>{getStoreName(store.id)}</button>)}</div></div>
            ) : null}
            <div className="base-shift-section">
              <div className="base-shift-title"><strong>요일별 기본 근무</strong>{isAddingEmployee ? <div className="base-shift-title-spacer" aria-hidden="true" /> : <div><Dropdown value={activeBaseStoreId} options={baseStoreOptions} onChange={props.onStoreChange} ariaLabel="기본 근무 매장 선택" /><small>기준</small></div>}</div>
              {isAddingEmployee ? (
                <div className="base-shift-placeholder">
                  <p>직원 추가 후 기본 근무를 설정할 수 있습니다.</p>
                </div>
              ) : (
                <>
              <div className="base-shift-list">
                {groupedBaseShifts.map((group) => <div className="base-shift-item" key={group.key}><span>{group.weekdays.map((weekday) => weekdays[weekday]).join(', ')}</span><strong>{baseShiftTypeLabel(group.templateId)}</strong><small>{group.startTime}-{group.endTime}</small>{props.isManager ? <button type="button" onClick={() => props.onBaseShiftDelete(group.ruleIds)}>삭제</button> : null}</div>)}
                {!groupedBaseShifts.length ? <p>이 매장의 기본 근무정보가 없습니다.</p> : null}
              </div>
              {props.isManager ? (
                <form className="base-shift-form profile-base-form" onSubmit={props.onBaseShiftAdd}>
                  <div className="base-weekday-selector"><span>요일 선택</span><div>{weekdays.map((weekday, index) => <button type="button" key={weekday} className={baseShiftDraft.weekdays.includes(index) ? 'is-selected' : undefined} onClick={() => props.onBaseShiftWeekdayToggle(index)}>{weekday}</button>)}</div></div>
                  <div className="base-shift-type-selector"><span>근무 유형</span><div>{baseShiftTypes.map((type) => <button type="button" key={type.value} className={baseShiftDraft.templateId === type.value ? 'is-selected' : undefined} onClick={() => props.onTemplateSelect(type.value)}>{type.label}</button>)}</div></div>
                  <label>시작 시간<TimePicker value={baseShiftDraft.startTime} onChange={(startTime) => props.setBaseShiftDraft((current) => ({ ...current, startTime }))} ariaLabel="기본 근무 시작 시간" /></label>
                  <label>종료 시간<TimePicker value={baseShiftDraft.endTime} onChange={(endTime) => props.setBaseShiftDraft((current) => ({ ...current, endTime }))} ariaLabel="기본 근무 종료 시간" /></label>
                  <button className="primary" type="submit" disabled={!baseShiftDraft.weekdays.length}>기본 근무 추가</button>
                </form>
              ) : null}
                </>
              )}
            </div>
            {props.isManager ? <div className="profile-edit-actions"><button className="danger" type="button" onClick={() => isAddingEmployee ? props.onFormClose() : selectedEmployee && props.onEmployeeDelete(selectedEmployee)}>{isAddingEmployee ? '취소' : '직원 삭제'}</button><button className="primary" type="submit" form="selected-employee-form" disabled={!activeEmployeeDraft.name.trim() || !activeEmployeeDraft.storeIds.length}>{isAddingEmployee ? '직원 추가' : '저장'}</button></div> : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
