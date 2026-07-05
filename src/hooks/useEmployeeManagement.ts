import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { initialEmployees } from '../domain/data';
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
  ShiftTemplate,
} from '../domain/types';
import { splitShiftTime, templateById } from '../utils/schedule';

type Options = {
  employees: Employee[];
  templates: ShiftTemplate[];
  storeId: string;
  storeFilter: string;
  activeView: ActiveView;
  isManager: boolean;
  setStoreId: (storeId: string) => void;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
  setGenerationMessage: (message: string) => void;
};

export function useEmployeeManagement(options: Options) {
  const { employees, templates, storeId, storeFilter, activeView, isManager, setStoreId, setDraft, setSchedule, setGenerationMessage } = options;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployees[0].id);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft>(createInitialEmployeeDraft);
  const [baseShiftDraft, setBaseShiftDraft] = useState<BaseShiftDraft>(createInitialBaseShiftDraft);
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

  function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) return;
    const name = employeeDraft.name.trim();
    if (!name || !employeeDraft.storeIds.length) return;

    if (editingEmployeeId) {
      setSchedule((current) => ({
        ...current,
        employees: current.employees.map((employee) => employee.id !== editingEmployeeId ? employee : {
          ...employee,
          name,
          preference: employeeDraft.preference.trim() || '근무 조건 미입력',
          color: employeeDraft.color,
          storeIds: employeeDraft.storeIds,
          baseShifts: employee.baseShifts.filter((rule) => employeeDraft.storeIds.includes(rule.storeId)),
        }),
      }));
    } else {
      const newEmployee: Employee = {
        id: crypto.randomUUID(), name,
        preference: employeeDraft.preference.trim() || '근무 조건 미입력',
        color: employeeDraft.color, storeIds: employeeDraft.storeIds, baseShifts: [],
      };
      setSchedule((current) => ({ ...current, employees: [...current.employees, newEmployee] }));
      setSelectedEmployeeId(newEmployee.id);
      setDraft((current) => ({ ...current, employeeId: newEmployee.id }));
    }
    closeEmployeeForm();
  }

  function openAddEmployee() {
    setEditingEmployeeId(null);
    setEmployeeDraft(createInitialEmployeeDraft(storeFilter === 'all' ? storeId : storeFilter));
    setShowEmployeeForm(true);
  }

  function openEditEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setEditingEmployeeId(employee.id);
    setEmployeeDraft({ name: employee.name, preference: employee.preference, color: employee.color, storeIds: [...employee.storeIds] });
    setShowEmployeeForm(true);
  }

  function closeEmployeeForm() {
    setShowEmployeeForm(false);
    setEditingEmployeeId(null);
    setEmployeeDraft(createInitialEmployeeDraft(storeId));
  }

  function deleteEmployee(employee: Employee) {
    if (!isManager || !window.confirm(`${employee.name} 직원을 삭제할까요? 등록된 모든 근무 일정도 함께 삭제됩니다.`)) return;
    setSchedule((current) => ({
      ...current,
      employees: current.employees.filter((item) => item.id !== employee.id),
      shifts: current.shifts.filter((shift) => shift.employeeId !== employee.id),
    }));
    setSelectedEmployeeId(employees.find((item) => item.id !== employee.id)?.id ?? '');
    closeEmployeeForm();
  }

  function selectManagedEmployee(employee: Employee) {
    setSelectedEmployeeId(employee.id);
    setBaseShiftDraft(createInitialBaseShiftDraft());
    if (!employee.storeIds.includes(storeId)) setStoreId(employee.storeIds[0]);
  }

  function toggleDraftStore(nextStoreId: string) {
    setEmployeeDraft((current) => ({ ...current, storeIds: current.storeIds.includes(nextStoreId) ? current.storeIds.filter((id) => id !== nextStoreId) : [...current.storeIds, nextStoreId] }));
  }

  function selectBaseShiftTemplate(templateId: string) {
    const template = templateById(templateId, templates);
    const { startTime, endTime } = splitShiftTime(template.time);
    setBaseShiftDraft((current) => ({ ...current, templateId, startTime, endTime }));
  }

  function addBaseShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager || !selectedEmployee) return;
    const newRule: BaseShiftRule = { id: crypto.randomUUID(), storeId, ...baseShiftDraft };
    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? { ...employee, baseShifts: [...employee.baseShifts, newRule] } : employee),
    }));
    setBaseShiftDraft(createInitialBaseShiftDraft());
    setGenerationMessage('');
  }

  function deleteBaseShift(ruleId: string) {
    if (!isManager || !selectedEmployee) return;
    setSchedule((current) => ({
      ...current,
      employees: current.employees.map((employee) => employee.id === selectedEmployee.id ? { ...employee, baseShifts: employee.baseShifts.filter((rule) => rule.id !== ruleId) } : employee),
    }));
    setGenerationMessage('');
  }

  return {
    selectedEmployeeId, setSelectedEmployeeId, showEmployeeForm,
    editingEmployeeId, employeeDraft, setEmployeeDraft, baseShiftDraft,
    setBaseShiftDraft, storeEmployees, filteredEmployees, selectedEmployee,
    scheduleSelectedEmployee, selectedEmployeeBaseShifts, saveEmployee,
    openAddEmployee, openEditEmployee, closeEmployeeForm, deleteEmployee,
    selectManagedEmployee, toggleDraftStore, selectBaseShiftTemplate,
    addBaseShift, deleteBaseShift,
  };
}
