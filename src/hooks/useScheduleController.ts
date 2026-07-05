import { useEffect, useMemo, useState } from 'react';
import { initialWeekStart, stores } from '../domain/data';
import {
  createInitialDraft,
} from "../domain/drafts";
import type {
  ActiveView,
  DraftShift,
  Shift,
} from "../domain/types";
import { getStoreShifts } from '../domain/selectors';
import { useAuth } from './useAuth';
import { useEmployeeManagement } from './useEmployeeManagement';
import { useMemoManagement } from './useMemoManagement';
import { usePersistentSchedule } from './usePersistentSchedule';
import { useTemplateManagement } from './useTemplateManagement';
import {
  addDays,
  getWeekDays,
  getWeekStart,
  splitShiftTime,
  templateById,
  toDate,
} from "../utils/schedule";

export function useScheduleController() {
  const [{ employees, shifts, notes, templates }, setSchedule] =
    usePersistentSchedule();
  const [activeView, setActiveView] = useState<ActiveView>('schedule');
  const [storeId, setStoreId] = useState(stores[0].id);
  const [dashboardMonth, setDashboardMonth] = useState(initialWeekStart.slice(0, 7));
  const [employeeStoreFilter, setEmployeeStoreFilter] = useState('all');
  const [noteStoreFilter, setNoteStoreFilter] = useState('all');
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(days[2]);
  const [draft, setDraft] = useState<DraftShift>(() => createInitialDraft(days[2]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState('');
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftTimeError, setShiftTimeError] = useState('');
  const {
    role,
    loginId,
    setLoginId,
    loginPassword,
    setLoginPassword,
    loginError,
    setLoginError,
    login,
    logout,
  } = useAuth({
    onLogin: () => setActiveView('schedule'),
    onLogout: () => {
      setActiveView('schedule');
      setShowShiftModal(false);
    },
  });

  const isManager = role === 'manager';
  const {
    selectedEmployeeId,
    setSelectedEmployeeId,
    showEmployeeForm,
    editingEmployeeId,
    employeeDraft,
    setEmployeeDraft,
    baseShiftDraft,
    setBaseShiftDraft,
    storeEmployees,
    filteredEmployees,
    selectedEmployee,
    scheduleSelectedEmployee,
    selectedEmployeeBaseShifts,
    saveEmployee,
    openAddEmployee,
    openEditEmployee,
    closeEmployeeForm,
    deleteEmployee,
    selectManagedEmployee,
    toggleDraftStore,
    selectBaseShiftTemplate,
    addBaseShift,
    deleteBaseShift,
  } = useEmployeeManagement({
    employees,
    templates,
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
    selectedNote,
    filteredNotes,
    noteDraft,
    setNoteDraft,
    memoStoreId,
    setMemoStoreId,
    memoDate,
    setMemoDate,
    memoText,
    setMemoText,
    editingMemoKey,
    saveNote,
    saveMemo,
    editMemo,
    deleteMemo,
    resetMemoForm,
  } = useMemoManagement({
    notes,
    storeId,
    selectedDate,
    storeFilter: noteStoreFilter,
    isManager,
    setSchedule,
  });
  const visibleShifts = getStoreShifts(shifts, storeId);

  useEffect(() => {
    if (!days.includes(selectedDate)) {
      setSelectedDate(days[0]);
      setDraft((current) => ({ ...current, date: days[0] }));
    }
  }, [days, selectedDate]);

  useEffect(() => {
    if (activeView === 'schedule' && scheduleSelectedEmployee) {
      setSelectedEmployeeId(scheduleSelectedEmployee.id);
      setDraft((current) => ({
        ...current,
        employeeId: scheduleSelectedEmployee.id,
      }));
    }
  }, [activeView, scheduleSelectedEmployee, setSelectedEmployeeId, storeId]);

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

  function selectTemplate(templateId: string) {
    const template = templateById(templateId, templates);
    setDraft((current) => ({
      ...current,
      templateId,
      time: template.time,
    }));
    setShiftTimeError('');
  }

  function updateDraftTime(part: 'start' | 'end', value: string) {
    const current = splitShiftTime(draft.time);
    const startTime = part === 'start' ? value : current.startTime;
    const endTime = part === 'end' ? value : current.endTime;
    setDraft((draftValue) => ({
      ...draftValue,
      time: `${startTime}-${endTime}`,
    }));
    setShiftTimeError('');
  }

  function resetDraft(date = selectedDate) {
    setEditingId(null);
    setDraft((current) => ({
      ...createInitialDraft(date),
      employeeId: employees[0]?.id ?? '',
      templateId: current.templateId,
      time: current.time,
    }));
  }

  function startAddShift(date: string) {
    if (!isManager) {
      return;
    }

    setSelectedDate(date);
    setEditingId(null);
    setDraft((current) => ({
      ...current,
      date,
      employeeId: scheduleSelectedEmployee?.id ?? current.employeeId,
    }));
    setShowShiftModal(true);
  }

  function submitShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) {
      return;
    }

    const { startTime, endTime } = splitShiftTime(draft.time);
    if (startTime === endTime) {
      setShiftTimeError('시작 시간과 종료 시간은 다르게 입력해야 합니다.');
      return;
    }

    if (editingId) {
      setSchedule((current) => ({
        ...current,
        shifts: current.shifts.map((shift) =>
          shift.id === editingId ? { ...shift, ...draft, storeId } : shift,
        ),
      }));
    } else {
      setSchedule((current) => ({
        ...current,
        shifts: [
          ...current.shifts,
          {
            id: crypto.randomUUID(),
            storeId,
            ...draft,
          },
        ],
      }));
    }

    resetDraft(draft.date);
    setShowShiftModal(false);
  }

  function editShift(shift: Shift) {
    if (!isManager) {
      return;
    }

    setSelectedDate(shift.date);
    setEditingId(shift.id);
    setDraft({
      date: shift.date,
      employeeId: shift.employeeId,
      templateId: shift.templateId,
      time: shift.time,
      note: shift.note ?? '',
    });
    setShowShiftModal(true);
  }

  function deleteShift() {
    if (!editingId || !isManager) {
      return;
    }

    removeShift(editingId);
    setShowShiftModal(false);
  }

  function closeShiftModal() {
    setShowShiftModal(false);
    setShiftTimeError('');
    resetDraft();
  }

  function removeShift(shiftId: string) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== shiftId),
    }));
    if (editingId === shiftId) {
      resetDraft();
    }
    setDraggingShiftId(null);
  }

  function moveShiftToDate(shiftId: string, date: string) {
    if (!isManager) {
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.id === shiftId ? { ...shift, date } : shift,
      ),
    }));
    if (editingId === shiftId) {
      setDraft((current) => ({ ...current, date }));
      setSelectedDate(date);
    }
    setDraggingShiftId(null);
  }

  function copyPreviousWeek() {
    if (!isManager) {
      return;
    }

    const copied = visibleShifts
      .filter((shift) => {
        const previousDate = addDays(shift.date, 7);
        return days.includes(previousDate);
      })
      .map((shift) => ({
        ...shift,
        id: crypto.randomUUID(),
        date: addDays(shift.date, 7),
      }));

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts.filter(
          (shift) => !(shift.storeId === storeId && days.includes(shift.date)),
        ),
        ...copied,
      ],
    }));
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

  function addDraggedEmployee(employeeId: string, date: string) {
    if (!isManager) {
      return;
    }

    const selectedTemplate = templateById(draft.templateId, templates);
    if (selectedTemplate.requiresTimeInput) {
      setSelectedDate(date);
      setEditingId(null);
      setDraft({
        date,
        employeeId,
        templateId: selectedTemplate.id,
        time: selectedTemplate.time,
        note: '',
      });
      setShiftTimeError('');
      setShowShiftModal(true);
      return;
    }

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts,
        {
          id: crypto.randomUUID(),
          storeId,
          date,
          employeeId,
          templateId: draft.templateId,
          time: draft.time,
        },
      ],
    }));
  }

  return {
    employees, shifts, notes, templates, activeView, setActiveView, storeId,
    setStoreId, dashboardMonth, setDashboardMonth, employeeStoreFilter,
    setEmployeeStoreFilter, noteStoreFilter, setNoteStoreFilter, role, loginId,
    setLoginId, loginPassword, setLoginPassword, loginError, setLoginError,
    days, selectedDate, setSelectedDate, draft, setDraft, editingId, noteDraft,
    setNoteDraft, selectedEmployeeId, setSelectedEmployeeId, showEmployeeForm,
    editingEmployeeId,
    employeeDraft, setEmployeeDraft, baseShiftDraft, setBaseShiftDraft,
    generationMessage, memoStoreId, setMemoStoreId, memoDate, setMemoDate,
    memoText, setMemoText, editingMemoKey, draggingShiftId, setDraggingShiftId,
    showShiftModal, shiftTimeError, templateDraft, setTemplateDraft,
    editingTemplateId, isManager, visibleShifts, storeEmployees,
    filteredEmployees, selectedEmployee, scheduleSelectedEmployee,
    selectedEmployeeBaseShifts, selectedNote, filteredNotes, login, logout,
    moveWeek, openScheduleDate, selectTemplate, updateDraftTime, startAddShift,
    submitShift, editShift, deleteShift, closeShiftModal, removeShift,
    moveShiftToDate, saveNote, saveMemo, editMemo, deleteMemo, resetMemoForm,
    copyPreviousWeek, generateBaseWeek, addDraggedEmployee, saveEmployee,
    openAddEmployee, openEditEmployee, closeEmployeeForm, deleteEmployee,
    selectManagedEmployee, toggleDraftStore, selectBaseShiftTemplate,
    addBaseShift, deleteBaseShift, saveTemplate, editTemplate,
    closeTemplateForm, deleteTemplate,
  };
}
