import { useEffect, useMemo, useState } from 'react';
import {
  stores as fallbackStores,
} from '../domain/data';
import type {
  ActiveView,
  Store,
} from "../domain/types";
import { getStoreShifts } from '../domain/selectors';
import { useAuth } from './useAuth';
import { useEmployeeManagement } from './useEmployeeManagement';
import { useMemoManagement } from './useMemoManagement';
import { usePersistentSchedule } from './usePersistentSchedule';
import { useShiftManagement } from './useShiftManagement';
import { useTemplateManagement } from './useTemplateManagement';
import {
  addDays,
  formatDate,
  getWeekDays,
  getWeekStart,
  toDate,
} from "../utils/schedule";

const ACTIVE_VIEW_SESSION_KEY = 'kingmw-active-view';
const activeViews: ActiveView[] = ['dashboard', 'schedule', 'employees', 'notes', 'settings'];

function loadActiveView(): ActiveView {
  const savedView = sessionStorage.getItem(ACTIVE_VIEW_SESSION_KEY);
  return activeViews.includes(savedView as ActiveView) ? savedView as ActiveView : 'schedule';
}

export function useScheduleController() {
  const today = formatDate(new Date());
  const {
    role,
    displayName,
    loginId,
    setLoginId,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    isAuthLoading,
    login,
    logout,
  } = useAuth({
    onLogin: () => setActiveView('schedule'),
    onLogout: () => {
      setActiveView('schedule');
      setShowShiftModal(false);
      setIsQuickShiftEntry(false);
      setPendingEmployeeDrop(null);
    },
  });
  const [{ stores, employees, shifts, notes, templates }, setSchedule, scheduleStatus] =
    usePersistentSchedule(role);
  const configuredStores = stores.length ? stores : fallbackStores;
  const [activeView, setActiveView] = useState<ActiveView>(loadActiveView);
  const [storeId, setStoreId] = useState(fallbackStores[0].id);
  const [dashboardMonth, setDashboardMonth] = useState(today.slice(0, 7));
  const [employeeStoreFilter, setEmployeeStoreFilter] = useState('all');
  const [noteStoreFilter, setNoteStoreFilter] = useState('all');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [generationMessage, setGenerationMessage] = useState('');

  const isManager = role === 'manager';
  const visibleShifts = getStoreShifts(shifts, storeId);
  const {
    draft,
    setDraft,
    editingId,
    draggingShiftId,
    setDraggingShiftId,
    showShiftModal,
    setShowShiftModal,
    isQuickShiftEntry,
    setIsQuickShiftEntry,
    shiftTimeError,
    pendingEmployeeDrop,
    setPendingEmployeeDrop,
    dragTemplates,
    selectTemplate,
    updateDraftTime,
    submitShift,
    editShift,
    deleteShift,
    closeShiftModal,
    removeShift,
    moveShiftToDate,
    copyPreviousWeek,
    addDraggedEmployee,
    selectDroppedEmployeeTemplate,
  } = useShiftManagement({
    days,
    employees,
    isManager,
    selectedDate,
    setSelectedDate,
    setSchedule,
    storeId,
    templates,
    visibleShifts,
  });

  useEffect(() => {
    if (!configuredStores.some((store) => store.id === storeId)) {
      setStoreId(configuredStores[0]?.id ?? fallbackStores[0].id);
    }
  }, [configuredStores, storeId]);

  const {
    selectedEmployeeId,
    setSelectedEmployeeId,
    showEmployeeForm,
    employeeDraft,
    setEmployeeDraft,
    selectedEmployeeDraft,
    setSelectedEmployeeDraft,
    baseShiftDraft,
    setBaseShiftDraft,
    storeEmployees,
    filteredEmployees,
    selectedEmployee,
    scheduleSelectedEmployee,
    selectedEmployeeBaseShifts,
    saveEmployee,
    saveSelectedEmployee,
    openAddEmployee,
    closeEmployeeForm,
    deleteEmployee,
    selectManagedEmployee,
    toggleDraftStore,
    toggleSelectedEmployeeStore,
    toggleBaseShiftWeekday,
    selectBaseShiftTemplate,
    addBaseShift,
    deleteBaseShift,
    editBaseShift,
    cancelBaseShiftEdit,
    editingBaseShiftIds,
  } = useEmployeeManagement({
    employees,
    stores: configuredStores,
    storeId,
    storeFilter: employeeStoreFilter,
    activeView,
    isManager,
    setStoreId,
    setDraft,
    setSchedule,
    setGenerationMessage,
  });
  const {
    templateDraft,
    setTemplateDraft,
    editingTemplateId,
    saveTemplate,
    editTemplate,
    closeTemplateForm,
    deleteTemplate,
  } = useTemplateManagement({
    templates,
    draft,
    baseShiftDraft,
    isManager,
    setDraft,
    setBaseShiftDraft,
    setSchedule,
  });
  const {
    filteredNotes,
    memoStoreId,
    setMemoStoreId,
    memoDate,
    setMemoDate,
    memoText,
    setMemoText,
    editingMemoKey,
    saveMemo,
    editMemo,
    deleteMemo,
    resetMemoForm,
  } = useMemoManagement({
    notes,
    stores: configuredStores,
    storeFilter: noteStoreFilter,
    isManager,
    setSchedule,
  });
  useEffect(() => {
    sessionStorage.setItem(ACTIVE_VIEW_SESSION_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'schedule' && scheduleSelectedEmployee) {
      setSelectedEmployeeId(scheduleSelectedEmployee.id);
      setDraft((current) => ({
        ...current,
        employeeId: scheduleSelectedEmployee.id,
      }));
    }
  }, [activeView, scheduleSelectedEmployee, setDraft, setSelectedEmployeeId, storeId]);

  useEffect(() => {
    if (role === 'viewer' && activeView !== 'schedule') {
      setActiveView('schedule');
    }
  }, [activeView, role]);

  function moveWeek(direction: -1 | 1) {
    setWeekStart((current) => addDays(current, direction * 7));
  }

  function openScheduleDate(date: string) {
    setSelectedDate(date);
    setWeekStart(getWeekStart(date));
    setDraft((current) => ({ ...current, date }));
    setActiveView('schedule');
  }

  function generateBaseWeek() {
    if (!isManager) {
      return;
    }

    const generated = days.flatMap((date) => {
      const weekday = toDate(date).getDay();

      return storeEmployees.flatMap((employee) =>
        employee.baseShifts
          .filter(
            (rule) => rule.storeId === storeId && rule.weekday === weekday,
          )
          .map((rule) => ({
            id: crypto.randomUUID(),
            storeId,
            date,
            employeeId: employee.id,
            templateId: rule.templateId,
            time: `${rule.startTime}-${rule.endTime}`,
          })),
      );
    });

    if (!generated.length) {
      setGenerationMessage(
        '이 매장에 등록된 기본 근무 패턴이 없습니다. 직원 정보에서 먼저 등록하세요.',
      );
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts.filter(
          (shift) => !(shift.storeId === storeId && days.includes(shift.date)),
        ),
        ...generated,
      ],
    }));
    setGenerationMessage(`${generated.length}건의 기본 근무를 생성했습니다.`);
  }

  function saveStores(nextStores: Store[]) {
    if (!isManager) return;
    setSchedule((current) => ({
      ...current,
      stores: nextStores,
    }));
  }

  return {
    stores: configuredStores, employees, shifts, notes, templates, activeView, setActiveView, storeId,
    setStoreId, dashboardMonth, setDashboardMonth, employeeStoreFilter,
    setEmployeeStoreFilter, noteStoreFilter, setNoteStoreFilter, role, displayName, loginId,
    setLoginId, loginPassword, setLoginPassword, loginError, setLoginError,
    isAuthLoading, scheduleStatus,
    days, selectedDate, setSelectedDate, draft, setDraft, editingId,
    selectedEmployeeId, setSelectedEmployeeId, showEmployeeForm,
    employeeDraft, setEmployeeDraft, selectedEmployeeDraft,
    setSelectedEmployeeDraft, baseShiftDraft, setBaseShiftDraft,
    generationMessage, memoStoreId, setMemoStoreId, memoDate, setMemoDate,
    memoText, setMemoText, editingMemoKey, draggingShiftId, setDraggingShiftId,
    showShiftModal, isQuickShiftEntry, shiftTimeError, pendingEmployeeDrop,
    dragTemplates,
    templateDraft, setTemplateDraft,
    editingTemplateId, isManager, visibleShifts, storeEmployees,
    filteredEmployees, selectedEmployee, scheduleSelectedEmployee,
    selectedEmployeeBaseShifts, filteredNotes, login, logout,
    moveWeek, openScheduleDate, selectTemplate, updateDraftTime,
    submitShift, editShift, deleteShift, closeShiftModal, removeShift,
    moveShiftToDate, saveMemo, editMemo, deleteMemo, resetMemoForm,
    copyPreviousWeek, generateBaseWeek, addDraggedEmployee,
    selectDroppedEmployeeTemplate, setPendingEmployeeDrop, saveEmployee,
    saveSelectedEmployee, openAddEmployee, closeEmployeeForm, deleteEmployee,
    selectManagedEmployee, toggleDraftStore, toggleSelectedEmployeeStore,
    toggleBaseShiftWeekday, selectBaseShiftTemplate,
    addBaseShift, deleteBaseShift, editBaseShift, cancelBaseShiftEdit,
    editingBaseShiftIds, saveTemplate, editTemplate,
    closeTemplateForm, deleteTemplate, saveStores,
  };
}
