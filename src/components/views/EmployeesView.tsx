import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { getStoreItemCount, getStoreName } from '../../domain/selectors';
import type {
  BaseShiftDraft,
  BaseShiftRule,
  Employee,
  EmployeeDraft,
  Store,
} from '../../domain/types';
import { StoreFilter } from '../common/StoreFilter';
import { Dropdown } from '../common/Dropdown';
import { EmployeeBaseShiftSection } from './EmployeeBaseShiftSection';
import { EmployeeCardList } from './EmployeeCardList';
import { profileColorOptions } from './employeeViewModel';

type EmployeesViewProps = {
  employees: Employee[];
  stores: Store[];
  filteredEmployees: Employee[];
  selectedEmployee?: Employee;
  selectedBaseShifts: BaseShiftRule[];
  storeId: string;
  storeFilter: string;
  searchKeyword: string;
  statusFilter: 'all' | 'active' | 'inactive';
  isSaving: boolean;
  showForm: boolean;
  employeeDraft: EmployeeDraft;
  selectedEmployeeDraft: EmployeeDraft;
  baseShiftDraft: BaseShiftDraft;
  isManager: boolean;
  canReorder: boolean;
  setEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>>;
  setSelectedEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>>;
  setBaseShiftDraft: Dispatch<SetStateAction<BaseShiftDraft>>;
  onStoreFilterChange: (storeId: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  onStoreChange: (storeId: string) => void;
  onAddOpen: () => void;
  onFormClose: () => void;
  onEmployeeSave: (event: FormEvent<HTMLFormElement>) => void;
  onSelectedEmployeeSave: (event: FormEvent<HTMLFormElement>) => void;
  onEmployeeDelete: (employee: Employee) => void;
  onEmployeeSelect: (employee: Employee) => void;
  onEmployeesReorder: (employees: Employee[]) => Promise<void> | void;
  onStoreToggle: (storeId: string) => void;
  onSelectedStoreToggle: (storeId: string) => void;
  onBaseShiftWeekdayToggle: (weekday: number) => void;
  onTemplateSelect: (templateId: string) => void;
  onBaseShiftAdd: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onBaseShiftDelete: (ruleIds: string | string[]) => void;
  onBaseShiftEdit: (ruleIds: string[]) => void;
  onBaseShiftEditCancel: () => void;
  editingBaseShiftIds: string[];
};

export function EmployeesView(props: EmployeesViewProps) {
  const { selectedEmployee, employeeDraft, selectedEmployeeDraft, baseShiftDraft, onStoreChange, storeId, stores } = props;
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedEmployees, setOrderedEmployees] = useState(props.filteredEmployees);
  const [isOrderSaving, setIsOrderSaving] = useState(false);
  const [orderError, setOrderError] = useState('');
  const isAddingEmployee = props.showForm;
  const activeEmployeeDraft = isAddingEmployee ? employeeDraft : selectedEmployeeDraft;
  const setActiveEmployeeDraft = isAddingEmployee ? props.setEmployeeDraft : props.setSelectedEmployeeDraft;
  const toggleActiveStore = isAddingEmployee ? props.onStoreToggle : props.onSelectedStoreToggle;
  const selectedEmployeeId = selectedEmployee?.id;

  useEffect(() => {
    setIsNameEditing(isAddingEmployee);
  }, [isAddingEmployee, selectedEmployeeId]);

  useEffect(() => {
    if (!isReorderMode) setOrderedEmployees(props.filteredEmployees);
  }, [isReorderMode, props.filteredEmployees]);

  async function toggleReorderMode() {
    setOrderError('');
    if (!isReorderMode) {
      setOrderedEmployees(props.filteredEmployees);
      setIsReorderMode(true);
      return;
    }

    setIsOrderSaving(true);
    try {
      await props.onEmployeesReorder(orderedEmployees);
      setIsReorderMode(false);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : '직원 순서를 저장하지 못했습니다.');
    } finally {
      setIsOrderSaving(false);
    }
  }

  useEffect(() => {
    if (isAddingEmployee || !selectedEmployeeId || !selectedEmployeeDraft.storeIds.length) return;
    if (!selectedEmployeeDraft.storeIds.includes(storeId)) {
      onStoreChange(selectedEmployeeDraft.storeIds[0]);
    }
  }, [isAddingEmployee, onStoreChange, selectedEmployeeDraft.storeIds, selectedEmployeeId, storeId]);

  return (
    <>
      <header className="employee-page-header">
        <div><h1>직원 관리</h1><p>직원 정보와 매장별 기본 근무 요일·시간을 관리합니다.</p></div>
        <div className="employee-page-actions">
          {props.canReorder ? <button className={`employee-reorder-button ${isReorderMode ? 'is-active' : ''}`} type="button" onClick={() => void toggleReorderMode()} disabled={isOrderSaving}><span aria-hidden="true">↕</span>{isOrderSaving ? '저장 중...' : isReorderMode ? '완료' : '위치 변경'}</button> : null}
          <button className="primary employee-add-button" type="button" onClick={props.onAddOpen}>+ 직원 추가</button>
        </div>
      </header>
      {orderError ? <p className="employee-order-error">{orderError}</p> : null}
      <StoreFilter
        activeStoreId={props.storeFilter}
        stores={stores}
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
      <div className="employee-list-filters">
        <label><span>직원 검색</span><input value={props.searchKeyword} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="이름 또는 직원 메모 검색" /></label>
        <Dropdown value={props.statusFilter} onChange={(value) => props.onStatusFilterChange(value as 'all' | 'active' | 'inactive')} options={[{ value: 'all', label: '전체 재직 상태' }, { value: 'active', label: '재직 중' }, { value: 'inactive', label: '비활성 · 퇴사' }]} ariaLabel="직원 재직 상태" />
      </div>
      <div className="employee-management-layout">
        <EmployeeCardList
          filteredEmployees={isReorderMode ? orderedEmployees : props.filteredEmployees}
          isAddingEmployee={isAddingEmployee}
          selectedEmployee={selectedEmployee}
          stores={stores}
          onEmployeeSelect={props.onEmployeeSelect}
          isReorderMode={isReorderMode}
          onOrderChange={setOrderedEmployees}
        />
        {selectedEmployee || isAddingEmployee ? (
          <aside className="employee-profile-panel">
            <div className="profile-heading">
              <span style={{ background: activeEmployeeDraft.color }}>{activeEmployeeDraft.name.slice(0, 1) || '?'}</span>
              <div>
                <div className="profile-name-row">
                  {isNameEditing ? <input value={activeEmployeeDraft.name} onChange={(event) => setActiveEmployeeDraft((current) => ({ ...current, name: event.target.value }))} placeholder="직원 이름" form="selected-employee-form" required /> : <h2>{activeEmployeeDraft.name || '새 직원'}</h2>}
                  {props.isManager && !isAddingEmployee ? <button type="button" className={`profile-name-edit-button ${isNameEditing ? 'is-confirm' : ''}`} aria-label={isNameEditing ? '직원 이름 수정 완료' : '직원 이름 수정'} onClick={() => setIsNameEditing((current) => !current)}>{isNameEditing ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.5 4 4 8-9" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.7 3.3a1.8 1.8 0 0 1 2.5 2.5L6.9 15.1l-3.4.8.8-3.4 9.4-9.2Z" /><path d="m12.5 4.5 3 3" /></svg>}</button> : null}
                </div>
                <p>{activeEmployeeDraft.preference ? <span>{activeEmployeeDraft.preference}</span> : null}<b>{activeEmployeeDraft.storeIds.length}개 매장 가능</b></p>
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
              <div className="profile-store-selector profile-store-editor"><strong>근무 가능 매장</strong><small>선택한 매장에서 근무가 가능합니다.</small><div>{stores.map((store) => <button type="button" className={activeEmployeeDraft.storeIds.includes(store.id) ? 'is-selected' : undefined} key={store.id} onClick={() => toggleActiveStore(store.id)}>{getStoreName(store.id, stores)}</button>)}</div></div>
            ) : null}
            <EmployeeBaseShiftSection
              baseShiftDraft={baseShiftDraft}
              editingBaseShiftIds={props.editingBaseShiftIds}
              isAddingEmployee={isAddingEmployee}
              isManager={props.isManager}
              selectedBaseShifts={props.selectedBaseShifts}
              selectedEmployeeId={selectedEmployeeId}
              selectedStoreIds={selectedEmployeeDraft.storeIds}
              storeId={storeId}
              stores={stores}
              setBaseShiftDraft={props.setBaseShiftDraft}
              onBaseShiftAdd={props.onBaseShiftAdd}
              onBaseShiftDelete={props.onBaseShiftDelete}
              onBaseShiftEdit={props.onBaseShiftEdit}
              onBaseShiftEditCancel={props.onBaseShiftEditCancel}
              onBaseShiftWeekdayToggle={props.onBaseShiftWeekdayToggle}
              onStoreChange={props.onStoreChange}
              onTemplateSelect={props.onTemplateSelect}
            />
            {props.isManager ? <div className="profile-edit-actions"><button className={isAddingEmployee || selectedEmployee?.isActive !== false ? 'danger' : undefined} type="button" onClick={() => isAddingEmployee ? props.onFormClose() : selectedEmployee && props.onEmployeeDelete(selectedEmployee)} disabled={props.isSaving}>{isAddingEmployee ? '취소' : selectedEmployee?.isActive === false || selectedEmployee?.employmentStatus === 'terminated' ? '직원 재활성화' : '퇴사 처리'}</button><button className="primary" type="submit" form="selected-employee-form" disabled={props.isSaving || !activeEmployeeDraft.name.trim() || !activeEmployeeDraft.storeIds.length}>{props.isSaving ? '저장 중...' : isAddingEmployee ? '직원 추가' : '저장'}</button></div> : null}
          </aside>
        ) : null}
      </div>
    </>
  );
}
