import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { initialEmployees, stores as fallbackStores } from '../domain/data';
import { createInitialBaseShiftDraft, createInitialEmployeeDraft } from '../domain/drafts';
import { filterEmployeesByStore, getStoreEmployees } from '../domain/selectors';
import type {
  ActiveView,
  BaseShiftDraft,
  BaseShiftRule,
  DraftShift,
  Employee,
  EmployeeDraft,
  ScheduleState,
  Store,
} from '../domain/types';

type Options = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  employees: Employee[];
  stores: Store[];
  storeId: string;
  storeFilter: string;
  activeView: ActiveView;
  setStoreId: (storeId: string) => void;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
  setGenerationMessage: (message: string) => void;
};

export function useEmployeeManagement(options: Options) {
  const { employees, stores, storeId, storeFilter, activeView, canCreate, canDelete, canUpdate, setStoreId, setDraft, setSchedule, setGenerationMessage } = options;
  const activeStores = stores.length ? stores : fallbackStores;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0].id);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(createInitialEmployeeDraft);
  const [selectedEmployeeDraft, setSelectedEmployeeDraftState] = useState<EmployeeDraft>(() => ({
    name: initialEmployees[0].name,
    preference: initialEmployees[0].preference,
    color: initialEmployees[0].color,
    storeIds: [...initialEmployees[0].storeIds],
  }));
  const [baseShiftDraft, setBaseShiftDraft] = useState<BaseShiftDraft>(createInitialBaseShiftDraft);
  const [editingBaseShiftIds, setEditingBaseShiftIds] = useState<string[]>([]);
  const storeEmployees = getStoreEmployees(employees, storeId);
  const filteredEmployees = filterEmployeesByStore(employees, storeFilter);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? filteredEmployees[0];
  const scheduleSelectedEmployee = storeEmployees.find((employee) => employee.id === selectedEmployeeId) ?? storeEmployees[0];
  const selectedEmployeeBaseShifts = selectedEmployee?.baseShifts
    .filter((rule) => rule.storeId === storeId)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)) ?? [];

  useEffect(() => {
    if (activeView === 'employees' && filteredEmployees.length && !filteredEmployees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [activeView, filteredEmployees, selectedEmployeeId]);

  useEffect(() => {
    if (activeView !== 'employees' || !selectedEmployee) return;
    setSelectedEmployeeDraftState({
      name: selectedEmployee.name,
      preference: selectedEmployee.preference,
      color: selectedEmployee.color,
      storeIds: [...selectedEmployee.storeIds],
    });
  }, [activeView, selectedEmployee]);

  function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    const name = employeeDraft.name.trim();
    if (!name || !employeeDraft.storeIds.length) return;

    const newEmployee: Employee = {
      id: crypto.randomUUID(), name,
      preference: employeeDraft.preference.trim() || '근무 조건 미입력',
      color: employeeDraft.color, storeIds: employeeDraft.storeIds, baseShifts: [],
    };
    setSchedule((current) => ({ ...current, employees: [...current.employees, newEmployee] }));
    setSelectedEmployeeId(newEmployee.id);
    setSelectedEmployeeDraftState({ name: newEmployee.name, preference: newEmployee.preference, color: newEmployee.color, storeIds: [...newEmployee.storeIds] });
    setDraft((current) => ({ ...current, employeeId: newEmployee.id }));
    closeEmployeeForm();
  }

  function saveSelectedEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate || !selectedEmployee) return;
    const name = selectedEmployeeDraft.name.trim();
    if (!name || !selectedEmployeeDraft.storeIds.length) return;

    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id !== selectedEmployee.id ? employee : {
        ...employee,
        name,
        preference: selectedEmployeeDraft.preference.trim() || '근무 조건 미입력',
        color: selectedEmployeeDraft.color,
        storeIds: selectedEmployeeDraft.storeIds,
        baseShifts: employee.baseShifts.filter((rule) => selectedEmployeeDraft.storeIds.includes(rule.storeId)),
      }),
    }));
    setGenerationMessage('');
  }

  function openAddEmployee() {
    if (!canCreate) return;
    setEmployeeDraft(createInitialEmployeeDraft(storeFilter === 'all' ? storeId : storeFilter));
    setShowEmployeeForm(true);
  }

  function closeEmployeeForm() {
    setShowEmployeeForm(false);
    setEmployeeDraft(createInitialEmployeeDraft(storeId || activeStores[0]?.id));
  }

  function deleteEmployee(employee: Employee) {
    if (!canDelete || !window.confirm(`${employee.name} 직원을 삭제할까요? 등록된 모든 근무 일정도 함께 삭제됩니다.`)) return;
    setSchedule((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== employee.id),
      shifts: current.shifts.filter((shift) => shift.employeeId !== employee.id),
    }));
    setSelectedEmployeeId(employees.find((item) => item.id !== employee.id)?.id ?? '');
    closeEmployeeForm();
  }

  function selectManagedEmployee(employee: Employee) {
    setShowEmployeeForm(false);
    setSelectedEmployeeId(employee.id);
    setSelectedEmployeeDraftState({ name: employee.name, preference: employee.preference, color: employee.color, storeIds: [...employee.storeIds] });
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setEditingBaseShiftIds([]);
    if (!employee.storeIds.includes(storeId)) setStoreId(employee.storeIds[0]);
  }

  function toggleDraftStore(nextStoreId: string) {
    if (!canCreate) return;
    setEmployeeDraft((current) => ({ ...current, storeIds: current.storeIds.includes(nextStoreId) ? current.storeIds.filter((id) => id !== nextStoreId) : [...current.storeIds, nextStoreId] }));
  }

  const setSelectedEmployeeDraft: Dispatch<SetStateAction<EmployeeDraft>> = (nextDraft) => {
    if (!canUpdate) return;
    setSelectedEmployeeDraftState((currentDraft) => {
      const resolvedDraft = typeof nextDraft === 'function' ? nextDraft(currentDraft) : nextDraft;
      if (selectedEmployeeId) {
        setSchedule((current) => ({
          ...current,
          employees: current.employees.map((employee) => employee.id !== selectedEmployeeId ? employee : {
            ...employee,
            name: resolvedDraft.name,
            preference: resolvedDraft.preference,
            color: resolvedDraft.color,
            storeIds: resolvedDraft.storeIds,
            baseShifts: employee.baseShifts.filter((rule) => resolvedDraft.storeIds.includes(rule.storeId)),
          }),
        }));
      }
      return resolvedDraft;
    });
  };

  function toggleSelectedEmployeeStore(nextStoreId: string) {
    if (!canUpdate) return;
    setSelectedEmployeeDraft((current) => {
      const storeIds = current.storeIds.includes(nextStoreId)
        ? current.storeIds.filter((id) => id !== nextStoreId)
        : [...current.storeIds, nextStoreId];
      if (storeIds.length && !storeIds.includes(storeId)) setStoreId(storeIds[0]);
      return { ...current, storeIds };
    });
  }

  function toggleBaseShiftWeekday(weekday: number) {
    if (!(editingBaseShiftIds.length ? canUpdate : canCreate)) return;
    if (selectedEmployeeBaseShifts.some((rule) =>
      rule.weekday === weekday &&
      rule.startTime === baseShiftDraft.startTime &&
      rule.endTime === baseShiftDraft.endTime &&
      !editingBaseShiftIds.includes(rule.id)
    )) {
      return;
    }

    setBaseShiftDraft((current) => {
      const weekdays = current.weekdays.includes(weekday)
        ? current.weekdays.filter((item) => item !== weekday)
        : [...current.weekdays, weekday].sort((a, b) => a - b);
      return { ...current, weekdays };
    });
  }

  function selectBaseShiftTemplate(templateId: string) {
    if (!(editingBaseShiftIds.length ? canUpdate : canCreate)) return;
    const timeByTemplateId: Record<string, { startTime: string; endTime: string }> = {
      open: { startTime: '08:00', endTime: '15:00' },
      middle: { startTime: '15:00', endTime: '22:00' },
      night: { startTime: '22:00', endTime: '08:00' },
      custom: { startTime: '00:00', endTime: '00:00' },
    };
    const time = timeByTemplateId[templateId] ?? timeByTemplateId.custom;
    setBaseShiftDraft((current) => ({ ...current, templateId, ...time }));
  }

  function addBaseShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(editingBaseShiftIds.length ? canUpdate : canCreate) || !selectedEmployee || !baseShiftDraft.weekdays.length) return;
    const occupiedWeekdays = new Set(
      selectedEmployee.baseShifts
        .filter((rule) =>
          rule.storeId === storeId &&
          rule.startTime === baseShiftDraft.startTime &&
          rule.endTime === baseShiftDraft.endTime &&
          !editingBaseShiftIds.includes(rule.id)
        )
        .map((rule) => rule.weekday),
    );
    const uniqueWeekdays = [...new Set(baseShiftDraft.weekdays)].filter((weekday) => !occupiedWeekdays.has(weekday));
    if (!uniqueWeekdays.length) return;

    const newRules: BaseShiftRule[] = uniqueWeekdays.map((weekday) => ({
      id: crypto.randomUUID(),
      storeId,
      weekday,
      templateId: baseShiftDraft.templateId,
      startTime: baseShiftDraft.startTime,
      endTime: baseShiftDraft.endTime,
    }));
    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? {
        ...employee,
        baseShifts: [
          ...employee.baseShifts.filter((rule) => !editingBaseShiftIds.includes(rule.id)),
          ...newRules,
        ],
      } : employee),
    }));
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setEditingBaseShiftIds([]);
    setGenerationMessage('');
  }

  function deleteBaseShift(ruleIds: string | string[]) {
    if (!canDelete || !selectedEmployee) return;
    const deleteIds = Array.isArray(ruleIds) ? ruleIds : [ruleIds];
    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? { ...employee, baseShifts: employee.baseShifts.filter((rule) => !deleteIds.includes(rule.id)) } : employee),
    }));
    if (editingBaseShiftIds.some((ruleId) => deleteIds.includes(ruleId))) {
      setBaseShiftDraft(createInitialBaseShiftDraft());
      setEditingBaseShiftIds([]);
    }
    setGenerationMessage('');
  }

  function editBaseShift(ruleIds: string[]) {
    if (!canUpdate || !selectedEmployee) return;

    const rules = selectedEmployee.baseShifts
      .filter((rule) => ruleIds.includes(rule.id))
      .sort((a, b) => a.weekday - b.weekday);
    const firstRule = rules[0];
    if (!firstRule) return;

    setEditingBaseShiftIds(rules.map((rule) => rule.id));
    setBaseShiftDraft({
      weekdays: [...new Set(rules.map((rule) => rule.weekday))],
      templateId: firstRule.templateId,
      startTime: firstRule.startTime,
      endTime: firstRule.endTime,
    });
  }

  function cancelBaseShiftEdit() {
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setEditingBaseShiftIds([]);
  }

  return {
    selectedEmployeeId, setSelectedEmployeeId, showEmployeeForm,
    employeeDraft, setEmployeeDraft,
    selectedEmployeeDraft, setSelectedEmployeeDraft, baseShiftDraft,
    setBaseShiftDraft, storeEmployees, filteredEmployees, selectedEmployee,
    scheduleSelectedEmployee, selectedEmployeeBaseShifts, saveEmployee,
    saveSelectedEmployee,
    openAddEmployee, closeEmployeeForm, deleteEmployee,
    selectManagedEmployee, toggleDraftStore, toggleSelectedEmployeeStore,
    toggleBaseShiftWeekday, selectBaseShiftTemplate,
    addBaseShift, deleteBaseShift, editBaseShift, cancelBaseShiftEdit,
    editingBaseShiftIds,
  };
}
