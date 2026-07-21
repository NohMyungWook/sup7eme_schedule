import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasPermission } from '../domain/permissions';
import type {
  ActiveView,
  SettingsPanel,
  Store,
} from "../domain/types";
import { getStoreShifts } from '../domain/selectors';
import { saveEmployeeOrder } from '../services/employeeApi';
import { fetchAdminShifts, runScheduleAction } from '../services/shiftApi';
import { deleteStoreFromApi, saveStoresToApi } from '../services/storeApi';
import { useAuth } from './useAuth';
import { useEmployeeManagement } from './useEmployeeManagement';
import { useMemoManagement } from './useMemoManagement';
import { usePersistentSchedule } from './usePersistentSchedule';
import { useShiftManagement } from './useShiftManagement';
import { useTemplateManagement } from './useTemplateManagement';
import { addDays, formatDate, getMonthDays, getWeekDays, getWeekStart } from "../utils/schedule";

const ACTIVE_VIEW_SESSION_KEY = 'kingmw-active-view';
const activeViews: ActiveView[] = ['dashboard', 'schedule', 'employees', 'notes', 'settings'];
const settingsPanels: SettingsPanel[] = ['overview', 'templates', 'stores', 'accounts', 'leave-requests', 'rules'];

function loadActiveView(): ActiveView {
  const routeView = getRouteView();
  if (routeView) return routeView;

  const savedView = sessionStorage.getItem(ACTIVE_VIEW_SESSION_KEY);
  return activeViews.includes(savedView as ActiveView) ? savedView as ActiveView : 'schedule';
}

function loadActiveSettingsPanel(): SettingsPanel {
  return getRouteSettingsPanel() ?? 'overview';
}

export function useScheduleController() {
  const today = formatDate(new Date());
  const {
    user,
    role,
    displayName,
    permissions,
    loginId,
    setLoginId,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    isAuthLoading,
    login,
    logout,
    markPasswordChanged,
  } = useAuth({
    onLogin: () => setActiveView('schedule'),
    onLogout: () => {
      setActiveView('schedule');
      setShowShiftModal(false);
      setIsQuickShiftEntry(false);
      setPendingEmployeeDrop(null);
    },
  });
  const [{ stores, employees, shifts, notes, templates }, setSchedule, scheduleStatus, setScheduleWithoutSave, waitForPendingSaves] =
    usePersistentSchedule(role);
  const configuredStores = useMemo(
    () => stores.filter((store) => store.isActive),
    [stores],
  );
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive !== false && employee.employmentStatus !== 'terminated'),
    [employees],
  );
  const [activeView, setActiveView] = useState<ActiveView>(loadActiveView);
  const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanel>(loadActiveSettingsPanel);
  const syncedRouteKeyRef = useRef<string | null>(null);
  const isInitialRouteSyncRef = useRef(true);
  const [storeId, setStoreId] = useState('');
  const [dashboardMonth, setDashboardMonth] = useState(today.slice(0, 7));
  const [employeeStoreFilter, setEmployeeStoreFilter] = useState('all');
  const [noteStoreFilter, setNoteStoreFilter] = useState('all');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [generationMessage, setGenerationMessage] = useState('');
  const [isShiftRangeLoading, setIsShiftRangeLoading] = useState(false);
  const shiftRequestCountRef = useRef(0);

  useEffect(() => {
    setGenerationMessage('');
  }, [activeView]);

  const isManager = role === 'manager';
  const canViewDashboard = hasPermission(permissions, 'dashboard', 'view');
  const canViewSchedule = hasPermission(permissions, 'schedule', 'view');
  const canViewEmployees = hasPermission(permissions, 'employees', 'view');
  const canViewNotes = hasPermission(permissions, 'notes', 'view');
  const canViewSettings = hasPermission(permissions, 'settings', 'view');
  const canCreateSchedule = hasPermission(permissions, 'schedule', 'create');
  const canUpdateSchedule = hasPermission(permissions, 'schedule', 'update');
  const canDeleteSchedule = hasPermission(permissions, 'schedule', 'delete');
  const canCreateEmployees = hasPermission(permissions, 'employees', 'create');
  const canUpdateEmployees = hasPermission(permissions, 'employees', 'update');
  const canDeleteEmployees = hasPermission(permissions, 'employees', 'delete');
  const canCreateNotes = hasPermission(permissions, 'notes', 'create');
  const canUpdateNotes = hasPermission(permissions, 'notes', 'update');
  const canDeleteNotes = hasPermission(permissions, 'notes', 'delete');
  const canCreateSettings = hasPermission(permissions, 'settings', 'create');
  const canUpdateSettings = hasPermission(permissions, 'settings', 'update');
  const canDeleteSettings = hasPermission(permissions, 'settings', 'delete');
  const canViewAccounts = hasPermission(permissions, 'accounts', 'view');
  const canCreateAccounts = hasPermission(permissions, 'accounts', 'create');
  const canUpdateAccounts = hasPermission(permissions, 'accounts', 'update');
  const canDeleteAccounts = hasPermission(permissions, 'accounts', 'delete');
  const canViewLeaveRequests = hasPermission(permissions, 'leaveRequests', 'view');
  const canUpdateLeaveRequests = hasPermission(permissions, 'leaveRequests', 'update');
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
    isShiftSaving,
  } = useShiftManagement({
    canCreate: canCreateSchedule,
    canDelete: canDeleteSchedule,
    canUpdate: canUpdateSchedule,
    days,
    employees: activeEmployees,
    selectedDate,
    setSelectedDate,
    setSchedule,
    storeId,
    templates,
    visibleShifts,
    setGenerationMessage,
  });

  useEffect(() => {
    if (!configuredStores.some((store) => store.id === storeId)) {
      setStoreId(configuredStores[0]?.id ?? '');
    }
  }, [configuredStores, storeId]);

  const loadShiftRange = useCallback(async (targetStoreId: string, startDate: string, endDate: string) => {
    if (!isManager || !targetStoreId || !startDate || !endDate) return;
    shiftRequestCountRef.current += 1;
    setIsShiftRangeLoading(true);
    try {
      const loadedShifts = await fetchAdminShifts(targetStoreId, startDate, endDate);
      setScheduleWithoutSave((current) => ({
        ...current,
        shifts: [
          ...current.shifts.filter((shift) => !(shift.storeId === targetStoreId && shift.date >= startDate && shift.date <= endDate)),
          ...loadedShifts,
        ],
      }));
    } catch (error) {
      if (activeView === 'schedule') setGenerationMessage(error instanceof Error ? error.message : '스케줄을 불러오지 못했습니다.');
    } finally {
      shiftRequestCountRef.current = Math.max(0, shiftRequestCountRef.current - 1);
      if (shiftRequestCountRef.current === 0) setIsShiftRangeLoading(false);
    }
  }, [activeView, isManager, setScheduleWithoutSave]);

  useEffect(() => {
    if (!storeId || !isManager) return;
    if (activeView === 'dashboard') {
      const monthDays = getMonthDays(dashboardMonth);
      void loadShiftRange(storeId, monthDays[0], monthDays[monthDays.length - 1]);
    } else if (activeView === 'schedule') {
      void loadShiftRange(storeId, addDays(days[0], -1), addDays(days[6], 35));
    }
  }, [activeView, dashboardMonth, days, isManager, loadShiftRange, storeId]);

  useEffect(() => {
    if (!isManager) return;
    const refreshVisibleRange = () => {
      if (activeView === 'dashboard') {
        const monthDays = getMonthDays(dashboardMonth);
        void loadShiftRange(storeId, monthDays[0], monthDays[monthDays.length - 1]);
      } else if (activeView === 'schedule') {
        void loadShiftRange(storeId, addDays(days[0], -1), addDays(days[6], 35));
      }
    };
    window.addEventListener('sup7eme:data-changed', refreshVisibleRange);
    window.addEventListener('focus', refreshVisibleRange);
    return () => {
      window.removeEventListener('sup7eme:data-changed', refreshVisibleRange);
      window.removeEventListener('focus', refreshVisibleRange);
    };
  }, [activeView, dashboardMonth, days, isManager, loadShiftRange, storeId]);

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
    employeeSearch, setEmployeeSearch, employeeStatusFilter, setEmployeeStatusFilter,
    isEmployeeSaving,
  } = useEmployeeManagement({
    canCreate: canCreateEmployees,
    canDelete: canDeleteEmployees,
    canUpdate: canUpdateEmployees,
    employees,
    stores: configuredStores,
    storeId,
    storeFilter: employeeStoreFilter,
    activeView,
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
    isTemplateSaving,
  } = useTemplateManagement({
    templates,
    draft,
    baseShiftDraft,
    canCreate: canCreateSettings,
    canDelete: canDeleteSettings,
    canUpdate: canUpdateSettings,
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
    isMemoSaving,
  } = useMemoManagement({
    canCreate: canCreateNotes,
    canDelete: canDeleteNotes,
    canUpdate: canUpdateNotes,
    notes,
    stores: configuredStores,
    storeFilter: noteStoreFilter,
    setSchedule,
  });
  useEffect(() => {
    sessionStorage.setItem(ACTIVE_VIEW_SESSION_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    function handlePopState() {
      const nextRoute = getRouteState();
      syncedRouteKeyRef.current = routeKey(nextRoute.activeView, nextRoute.activeSettingsPanel);
      setActiveView(nextRoute.activeView);
      setActiveSettingsPanel(nextRoute.activeSettingsPanel);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const currentRouteKey = routeKey(activeView, activeSettingsPanel);

    if (syncedRouteKeyRef.current === currentRouteKey) {
      syncedRouteKeyRef.current = null;
      return;
    }

    const nextUrl = createRouteUrl(activeView, activeSettingsPanel);

    if (isInitialRouteSyncRef.current) {
      if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(null, '', nextUrl);
      }
      isInitialRouteSyncRef.current = false;
      return;
    }

    if (nextUrl === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;

    window.history.pushState(null, '', nextUrl);
  }, [activeSettingsPanel, activeView]);

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
    if (!role) return;

    const canViewByActiveView: Record<ActiveView, boolean> = {
      dashboard: canViewDashboard,
      schedule: canViewSchedule,
      employees: canViewEmployees,
      notes: canViewNotes,
      settings: canViewSettings,
    };

    if (!canViewByActiveView[activeView]) {
      setActiveView(activeViews.find((view) => canViewByActiveView[view]) ?? 'schedule');
    }
  }, [activeView, canViewDashboard, canViewEmployees, canViewNotes, canViewSchedule, canViewSettings, role]);

  function moveWeek(direction: -1 | 1) {
    setWeekStart((current) => addDays(current, direction * 7));
  }

  function openScheduleDate(date: string) {
    setSelectedDate(date);
    setWeekStart(getWeekStart(date));
    setDraft((current) => ({ ...current, date }));
    setActiveView('schedule');
  }

  async function generateBaseWeek() {
    if (!canCreateSchedule) {
      return;
    }
    try {
      const result = await runScheduleAction('generate-base-week', storeId, days[0]);
      setGenerationMessage(`${result.created}건의 기본 근무를 생성했습니다.${result.skipped ? ` ${result.skipped}건은 중복 또는 휴무로 건너뛰었습니다.` : ''}`);
      window.dispatchEvent(new CustomEvent('sup7eme:data-changed', { detail: { resources: ['schedule', 'dashboard'] } }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '기본 주를 생성하지 못했습니다.');
    }
  }

  async function saveStores(nextStores: Store[]) {
    const currentIds = new Set(stores.map((store) => store.id));
    const nextIds = new Set(nextStores.map((store) => store.id));
    const isCreating = nextStores.some((store) => !currentIds.has(store.id));
    const isDeleting = stores.some((store) => !nextIds.has(store.id));
    const deactivatedStore = stores.find((store) => store.isActive && nextStores.some((next) => next.id === store.id && !next.isActive));
    if ((isCreating && !canCreateSettings) || ((isDeleting || deactivatedStore) && !canDeleteSettings)) return;
    if (!isCreating && !isDeleting && !deactivatedStore && !canUpdateSettings) return;

    await waitForPendingSaves();
    if (isDeleting || deactivatedStore) {
      const deletedStore = deactivatedStore ?? stores.find((store) => !nextIds.has(store.id));
      if (!deletedStore) return;
      await deleteStoreFromApi(deletedStore.id);
    } else {
      await saveStoresToApi(nextStores);
    }

    setScheduleWithoutSave((current) => ({
      ...current,
      stores: nextStores,
      employees: current.employees.map((employee) => ({
        ...employee,
        storeIds: employee.storeIds.filter((employeeStoreId) =>
          nextStores.some((store) => store.id === employeeStoreId),
        ),
        baseShifts: employee.baseShifts.filter((rule) =>
          nextStores.some((store) => store.id === rule.storeId),
        ),
      })),
      shifts: current.shifts.filter((shift) =>
        nextStores.some((store) => store.id === shift.storeId),
      ),
      notes: current.notes.filter((note) =>
        nextStores.some((store) => store.id === note.storeId),
      ),
    }));
  }

  async function reorderEmployees(orderedEmployees: typeof employees) {
    if (!canUpdateEmployees) return;
    const orderedIds = new Set(orderedEmployees.map((employee) => employee.id));
    const orderedIterator = orderedEmployees[Symbol.iterator]();
    const nextEmployees = employees.map((employee) =>
      orderedIds.has(employee.id) ? orderedIterator.next().value ?? employee : employee,
    );
    await saveEmployeeOrder(nextEmployees.map((employee) => employee.id));
    setScheduleWithoutSave((current) => ({
      ...current,
      employees: nextEmployees,
    }));
  }

  return {
    stores: configuredStores, allStores: stores, employees, shifts, notes, templates, activeView, setActiveView, activeSettingsPanel,
    setActiveSettingsPanel, storeId,
    setStoreId, dashboardMonth, setDashboardMonth, employeeStoreFilter,
    setEmployeeStoreFilter, noteStoreFilter, setNoteStoreFilter, user, role, displayName, permissions, loginId,
    setLoginId, loginPassword, setLoginPassword, loginError, setLoginError,
    isAuthLoading, scheduleStatus, isShiftRangeLoading,
    markPasswordChanged: () => {
      markPasswordChanged();
      void scheduleStatus.reload();
    },
    days, selectedDate, setSelectedDate, draft, setDraft, editingId,
    selectedEmployeeId, setSelectedEmployeeId, showEmployeeForm,
    employeeDraft, setEmployeeDraft, selectedEmployeeDraft,
    setSelectedEmployeeDraft, baseShiftDraft, setBaseShiftDraft,
    generationMessage, memoStoreId, setMemoStoreId, memoDate, setMemoDate,
    memoText, setMemoText, editingMemoKey, draggingShiftId, setDraggingShiftId,
    showShiftModal, isQuickShiftEntry, shiftTimeError, pendingEmployeeDrop,
    isShiftSaving,
    dragTemplates,
    templateDraft, setTemplateDraft,
    editingTemplateId, isManager, canViewDashboard, canViewSchedule,
    canViewEmployees, canViewNotes, canViewSettings,
    canCreateSchedule, canUpdateSchedule, canDeleteSchedule,
    canCreateEmployees, canUpdateEmployees, canDeleteEmployees,
    canCreateNotes, canUpdateNotes, canDeleteNotes,
    canCreateSettings, canUpdateSettings, canDeleteSettings,
    canViewAccounts, canCreateAccounts, canUpdateAccounts, canDeleteAccounts,
    canViewLeaveRequests, canUpdateLeaveRequests,
    visibleShifts, storeEmployees,
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
    employeeSearch, setEmployeeSearch, employeeStatusFilter, setEmployeeStatusFilter,
    isEmployeeSaving,
    closeTemplateForm, deleteTemplate, isTemplateSaving, saveStores, reorderEmployees, loadShiftRange,
    isMemoSaving,
  };
}

function getRouteState(): { activeView: ActiveView; activeSettingsPanel: SettingsPanel } {
  return {
    activeView: getRouteView() ?? loadSavedView(),
    activeSettingsPanel: getRouteSettingsPanel() ?? 'overview',
  };
}

function loadSavedView(): ActiveView {
  const savedView = sessionStorage.getItem(ACTIVE_VIEW_SESSION_KEY);
  return activeViews.includes(savedView as ActiveView) ? savedView as ActiveView : 'schedule';
}

function getRouteView(): ActiveView | null {
  const view = new URLSearchParams(window.location.search).get('view');
  return activeViews.includes(view as ActiveView) ? view as ActiveView : null;
}

function getRouteSettingsPanel(): SettingsPanel | null {
  const panel = new URLSearchParams(window.location.search).get('panel');
  return settingsPanels.includes(panel as SettingsPanel) ? panel as SettingsPanel : null;
}

function routeKey(activeView: ActiveView, activeSettingsPanel: SettingsPanel) {
  return `${activeView}:${activeView === 'settings' ? activeSettingsPanel : 'overview'}`;
}

function createRouteUrl(activeView: ActiveView, activeSettingsPanel: SettingsPanel) {
  const params = new URLSearchParams(window.location.search);
  params.set('view', activeView);

  if (activeView === 'settings' && activeSettingsPanel !== 'overview') {
    params.set('panel', activeSettingsPanel);
  } else {
    params.delete('panel');
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}
