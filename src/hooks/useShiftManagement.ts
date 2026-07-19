import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { createInitialDraft } from '../domain/drafts';
import type {
  DraftShift,
  Employee,
  PendingEmployeeDrop,
  ScheduleState,
  Shift,
  ShiftTemplate,
} from '../domain/types';
import { ApiRequestError } from '../services/apiClient';
import { cancelShiftFromApi, runScheduleAction, saveShiftToApi } from '../services/shiftApi';
import { splitShiftTime, templateById } from '../utils/schedule';

type UseShiftManagementOptions = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  days: string[];
  employees: Employee[];
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
  storeId: string;
  templates: ShiftTemplate[];
  visibleShifts: Shift[];
  setGenerationMessage: (message: string) => void;
};

export function useShiftManagement({
  canCreate,
  canDelete,
  canUpdate,
  days,
  employees,
  selectedDate,
  setSelectedDate,
  setSchedule,
  storeId,
  templates,
  visibleShifts,
  setGenerationMessage,
}: UseShiftManagementOptions) {
  const [draft, setDraft] = useState<DraftShift>(() => createInitialDraft(selectedDate));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isQuickShiftEntry, setIsQuickShiftEntry] = useState(false);
  const [pendingEmployeeDrop, setPendingEmployeeDrop] =
    useState<PendingEmployeeDrop | null>(null);
  const [shiftTimeError, setShiftTimeError] = useState('');
  const [isShiftSaving, setIsShiftSaving] = useState(false);
  const dragTemplates = templates.filter((template) => template.isActive !== false);

  useEffect(() => {
    if (!days.includes(selectedDate)) {
      setSelectedDate(days[0]);
      setDraft((current) => ({ ...current, date: days[0] }));
    }
  }, [days, selectedDate, setSelectedDate]);

  useEffect(() => {
    const fallbackEmployee = employees[0];
    const fallbackTemplate = templates[0];
    if (!fallbackEmployee && !fallbackTemplate) return;
    setDraft((current) => {
      const employeeId = employees.some((employee) => employee.id === current.employeeId)
        ? current.employeeId
        : fallbackEmployee?.id ?? '';
      const hasCurrentTemplate = templates.some((template) => template.id === current.templateId);
      const templateId = hasCurrentTemplate
        ? current.templateId
        : fallbackTemplate?.id ?? '';
      const time = hasCurrentTemplate
        ? current.time
        : fallbackTemplate?.time ?? current.time;

      if (
        current.employeeId === employeeId
        && current.templateId === templateId
        && current.time === time
      ) return current;

      return { ...current, employeeId, templateId, time };
    });
  }, [employees, templates]);

  function selectTemplate(templateId: string) {
    const template = templateById(templateId, templates);
    setDraft((current) => ({
      ...current,
      templateId: template.id,
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
      templateId: templates.some((template) => template.id === current.templateId)
        ? current.templateId
        : templates[0]?.id ?? '',
      time: templates.find((template) => template.id === current.templateId)?.time
        ?? templates[0]?.time
        ?? current.time,
    }));
  }

  async function submitShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isShiftSaving || (editingId ? !canUpdate : !canCreate)) return;

    const { startTime, endTime } = splitShiftTime(draft.time);
    if (startTime === endTime) {
      setShiftTimeError('시작 시간과 종료 시간은 다르게 입력해야 합니다.');
      return;
    }

    const existing = editingId ? visibleShifts.find((shift) => shift.id === editingId) : null;
    const nextShift: Shift = { id: editingId ?? crypto.randomUUID(), storeId, ...draft, updatedAt: existing?.updatedAt };
    setIsShiftSaving(true);
    try {
      const result = await saveShiftWithConflictConfirmation(nextShift, Boolean(editingId));
      setSchedule((current) => ({
        ...current,
        shifts: editingId
          ? current.shifts.map((shift) => shift.id === editingId ? { ...shift, ...result.shift } : shift)
          : [...current.shifts, result.shift],
      }));
      setGenerationMessage(editingId ? '근무 정보를 수정했습니다.' : '근무를 추가했습니다.');
    } catch (error) {
      setShiftTimeError(error instanceof Error ? error.message : '근무를 저장하지 못했습니다.');
      return;
    } finally {
      setIsShiftSaving(false);
    }

    resetDraft(draft.date);
    setShowShiftModal(false);
    setIsQuickShiftEntry(false);
  }

  function editShift(shift: Shift) {
    if (!canUpdate && !canDelete) return;

    setSelectedDate(shift.date);
    setEditingId(shift.id);
    setIsQuickShiftEntry(false);
    setDraft({
      date: shift.date,
      employeeId: shift.employeeId,
      templateId: shift.templateId,
      time: shift.time,
      note: shift.note ?? '',
    });
    setShowShiftModal(true);
  }

  async function deleteShift() {
    if (!editingId || !canDelete) return;
    if (await removeShift(editingId)) setShowShiftModal(false);
  }

  function closeShiftModal() {
    setShowShiftModal(false);
    setIsQuickShiftEntry(false);
    setShiftTimeError('');
    resetDraft();
  }

  async function removeShift(shiftId: string): Promise<boolean> {
    if (!canDelete || isShiftSaving) return false;
    const shift = visibleShifts.find((item) => item.id === shiftId);
    setIsShiftSaving(true);
    try {
      await cancelShiftFromApi(shiftId, shift?.updatedAt);
      setSchedule((current) => ({ ...current, shifts: current.shifts.filter((item) => item.id !== shiftId) }));
      setGenerationMessage('근무를 삭제했습니다. 과거 기록은 취소 상태로 보존됩니다.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '근무를 삭제하지 못했습니다.');
      return false;
    } finally {
      setIsShiftSaving(false);
    }
    if (editingId === shiftId) resetDraft();
    setDraggingShiftId(null);
    return true;
  }

  async function moveShiftToDate(shiftId: string, date: string) {
    if (!canUpdate || isShiftSaving) return;
    const original = visibleShifts.find((shift) => shift.id === shiftId);
    if (!original) return;
    setIsShiftSaving(true);
    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.id === shiftId ? { ...shift, date } : shift,
      ),
    }));
    try {
      const result = await saveShiftWithConflictConfirmation({ ...original, date }, true);
      setSchedule((current) => ({ ...current, shifts: current.shifts.map((shift) => shift.id === shiftId ? { ...shift, ...result.shift } : shift) }));
      setGenerationMessage('근무 날짜를 변경했습니다.');
    } catch (error) {
      setSchedule((current) => ({ ...current, shifts: current.shifts.map((shift) => shift.id === shiftId ? original : shift) }));
      window.alert(error instanceof Error ? error.message : '근무를 이동하지 못했습니다.');
    } finally {
      setIsShiftSaving(false);
    }
    if (editingId === shiftId) {
      setDraft((current) => ({ ...current, date }));
      setSelectedDate(date);
    }
    setDraggingShiftId(null);
  }

  async function copyPreviousWeek() {
    if (!canCreate) return;
    try {
      let result;
      try {
        result = await runScheduleAction('copy-previous-week', storeId, days[0]);
      } catch (error) {
        if (!(error instanceof ApiRequestError) || error.code !== 'TARGET_WEEK_NOT_EMPTY' || !window.confirm('대상 주에 근무가 있습니다. 기존 근무를 취소하고 지난주 스케줄로 덮어쓸까요?')) throw error;
        result = await runScheduleAction('copy-previous-week', storeId, days[0], true);
      }
      setGenerationMessage(`${result.created}건을 복사했습니다.${result.skipped ? ` ${result.skipped}건은 충돌로 건너뛰었습니다.` : ''}`);
      window.dispatchEvent(new CustomEvent('sup7eme:data-changed', { detail: { resources: ['schedule', 'dashboard'] } }));
    } catch (error) {
      setGenerationMessage(error instanceof Error ? error.message : '지난주 스케줄을 복사하지 못했습니다.');
    }
  }

  function addDraggedEmployee(employeeId: string, date: string) {
    if (!canCreate) return;
    setSelectedDate(date);
    setPendingEmployeeDrop({ employeeId, date });
  }

  async function selectDroppedEmployeeTemplate(templateId: string) {
    if (!canCreate || !pendingEmployeeDrop || isShiftSaving) return;

    const selectedTemplate = templateById(templateId, templates);
    if (!templates.some((template) => template.id === selectedTemplate.id)) {
      setPendingEmployeeDrop(null);
      return;
    }

    if (selectedTemplate.requiresTimeInput) {
      setEditingId(null);
      setDraft({
        date: pendingEmployeeDrop.date,
        employeeId: pendingEmployeeDrop.employeeId,
        templateId: selectedTemplate.id,
        time: selectedTemplate.time,
        note: '',
      });
      setShiftTimeError('');
      setPendingEmployeeDrop(null);
      setIsQuickShiftEntry(true);
      setShowShiftModal(true);
      return;
    }

    const nextShift: Shift = { id: crypto.randomUUID(), storeId, date: pendingEmployeeDrop.date, employeeId: pendingEmployeeDrop.employeeId, templateId: selectedTemplate.id, time: selectedTemplate.time };
    setIsShiftSaving(true);
    try {
      const result = await saveShiftWithConflictConfirmation(nextShift, false);
      setSchedule((current) => ({ ...current, shifts: [...current.shifts, result.shift] }));
      setPendingEmployeeDrop(null);
      setGenerationMessage('근무를 추가했습니다.');
    } catch (error) {
      setShiftTimeError(error instanceof Error ? error.message : '근무를 추가하지 못했습니다.');
      window.alert(error instanceof Error ? error.message : '근무를 추가하지 못했습니다.');
    } finally {
      setIsShiftSaving(false);
    }
  }

  async function saveShiftWithConflictConfirmation(shift: Shift, isUpdate: boolean) {
    try {
      return await saveShiftToApi(shift, isUpdate);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'PENDING_LEAVE_CONFLICT' && window.confirm(`${error.message}\n그래도 저장할까요?`)) {
        return saveShiftToApi(shift, isUpdate, true);
      }
      throw error;
    }
  }

  return {
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
  };
}
