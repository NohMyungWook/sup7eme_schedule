import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
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
import { createEmployee, setEmployeeStatus, updateEmployee } from '../services/employeeApi';

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(createInitialEmployeeDraft);
  const [selectedEmployeeDraft, setSelectedEmployeeDraftState] = useState<EmployeeDraft>(() => ({
    name: '',
    preference: '',
    color: '#dceeff',
    storeIds: [],
  }));
  const [baseShiftDraft, setBaseShiftDraft] = useState<BaseShiftDraft>(createInitialBaseShiftDraft);
  const [editingBaseShiftIds, setEditingBaseShiftIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isEmployeeSaving, setIsEmployeeSaving] = useState(false);
  const storeEmployees = getStoreEmployees(employees, storeId).filter((employee) => employee.isActive !== false && employee.employmentStatus !== 'terminated');
  const filteredEmployees = filterEmployeesByStore(employees, storeFilter).filter((employee) => {
    const isActive = employee.isActive !== false && employee.employmentStatus === 'active';
    if (employeeStatusFilter === 'active' && !isActive) return false;
    if (employeeStatusFilter === 'inactive' && isActive) return false;
    const keyword = employeeSearch.trim().toLowerCase();
    return !keyword || employee.name.toLowerCase().includes(keyword) || employee.preference.toLowerCase().includes(keyword);
  });
  const selectedEmployee = filteredEmployees.find((employee) => employee.id === selectedEmployeeId) ?? filteredEmployees[0];
  const scheduleSelectedEmployee = storeEmployees.find((employee) => employee.id === selectedEmployeeId) ?? storeEmployees[0];
  const selectedEmployeeBaseShifts = selectedEmployee?.baseShifts
    .filter((rule) => rule.storeId === storeId)
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)) ?? [];

  useEffect(() => {
    if (activeView === 'employees' && !filteredEmployees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(filteredEmployees[0]?.id ?? '');
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

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || isEmployeeSaving) return;
    const name = employeeDraft.name.trim();
    if (!name || !employeeDraft.storeIds.length) return;

    const newEmployee: Employee = {
      id: crypto.randomUUID(), name,
      preference: employeeDraft.preference.trim(),
      color: employeeDraft.color, storeIds: employeeDraft.storeIds, baseShifts: [],
    };
    setIsEmployeeSaving(true);
    try {
      const result = await createEmployee(newEmployee);
      setSchedule((current) => ({ ...current, employees: [...current.employees, result.employee] }));
      Object.assign(newEmployee, result.employee);
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '직원을 추가하지 못했습니다.');
      return;
    } finally {
      setIsEmployeeSaving(false);
    }
    setSelectedEmployeeId(newEmployee.id);
    setSelectedEmployeeDraftState({ name: newEmployee.name, preference: newEmployee.preference, color: newEmployee.color, storeIds: [...newEmployee.storeIds] });
    setDraft((current) => ({ ...current, employeeId: newEmployee.id }));
    closeEmployeeForm();
  }

  async function saveSelectedEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpdate || !selectedEmployee || isEmployeeSaving) return;
    const name = selectedEmployeeDraft.name.trim();
    if (!name || !selectedEmployeeDraft.storeIds.length) return;

    const nextEmployee = {
      ...selectedEmployee,
      name,
      preference: selectedEmployeeDraft.preference.trim(),
      color: selectedEmployeeDraft.color,
      storeIds: selectedEmployeeDraft.storeIds,
      baseShifts: selectedEmployee.baseShifts.filter((rule) => selectedEmployeeDraft.storeIds.includes(rule.storeId)),
    };
    setIsEmployeeSaving(true);
    try {
      const result = await updateEmployee(nextEmployee);
      setSchedule((current) => ({ ...current, employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? result.employee : employee) }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '직원 정보를 저장하지 못했습니다.');
      return;
    } finally {
      setIsEmployeeSaving(false);
    }
    setGenerationMessage('');
  }

  function openAddEmployee() {
    if (!canCreate) return;
    setEmployeeDraft(createInitialEmployeeDraft(storeFilter === 'all' ? storeId : storeFilter));
    setShowEmployeeForm(true);
  }

  function closeEmployeeForm() {
    setShowEmployeeForm(false);
    setEmployeeDraft(createInitialEmployeeDraft(storeId || stores[0]?.id));
  }

  async function deleteEmployee(employee: Employee) {
    const isActive = employee.isActive !== false && employee.employmentStatus === 'active';
    if (isActive && !canDelete) return;
    if (!isActive && !canUpdate) return;
    const nextStatus = isActive ? 'terminated' : 'active';
    const message = isActive
      ? `${employee.name} 직원을 퇴사 처리할까요? 과거 근무 기록은 유지되며 신규 배치 목록에서 제외됩니다.`
      : `${employee.name} 직원을 재활성화할까요? 다시 신규 스케줄에 배치할 수 있습니다.`;
    if (isEmployeeSaving || !window.confirm(message)) return;
    setIsEmployeeSaving(true);
    try {
      await setEmployeeStatus(employee.id, nextStatus);
      setSchedule((current) => ({ ...current, employees: current.employees.map((item) => item.id === employee.id ? { ...item, isActive: nextStatus === 'active', employmentStatus: nextStatus } : item) }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '직원 상태를 변경하지 못했습니다.');
      return;
    } finally {
      setIsEmployeeSaving(false);
    }
    setSelectedEmployeeId(employee.id);
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
    setSelectedEmployeeDraftState(nextDraft);
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

  async function addBaseShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isEmployeeSaving || !(editingBaseShiftIds.length ? canUpdate : canCreate) || !selectedEmployee || !baseShiftDraft.weekdays.length) return false;
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
    if (!uniqueWeekdays.length) return false;

    const newRules: BaseShiftRule[] = uniqueWeekdays.map((weekday) => ({
      id: crypto.randomUUID(),
      storeId,
      weekday,
      templateId: baseShiftDraft.templateId,
      startTime: baseShiftDraft.startTime,
      endTime: baseShiftDraft.endTime,
    }));
    const nextEmployee = {
      ...selectedEmployee,
      baseShifts: [
        ...selectedEmployee.baseShifts.filter((rule) => !editingBaseShiftIds.includes(rule.id)),
        ...newRules,
      ],
    };
    setIsEmployeeSaving(true);
    try {
      const result = await updateEmployee(nextEmployee);
      setSchedule((current) => ({ ...current, employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? result.employee : employee) }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '기본 근무를 저장하지 못했습니다.');
      return false;
    } finally {
      setIsEmployeeSaving(false);
    }
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setEditingBaseShiftIds([]);
    setGenerationMessage('');
    return true;
  }

  async function deleteBaseShift(ruleIds: string | string[]) {
    if (!canDelete || !selectedEmployee || isEmployeeSaving) return;
    const deleteIds = Array.isArray(ruleIds) ? ruleIds : [ruleIds];
    setIsEmployeeSaving(true);
    try {
      const result = await updateEmployee({ ...selectedEmployee, baseShifts: selectedEmployee.baseShifts.filter((rule) => !deleteIds.includes(rule.id)) });
      setSchedule((current) => ({ ...current, employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? result.employee : employee) }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '기본 근무를 삭제하지 못했습니다.');
      return;
    } finally {
      setIsEmployeeSaving(false);
    }
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
    employeeSearch, setEmployeeSearch, employeeStatusFilter, setEmployeeStatusFilter,
    isEmployeeSaving,
  };
}
