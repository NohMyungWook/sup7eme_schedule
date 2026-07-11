import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { employeeDropTemplateIds } from '../domain/data';
import { createInitialDraft } from '../domain/drafts';
import type {
  DraftShift,
  Employee,
  PendingEmployeeDrop,
  ScheduleState,
  Shift,
  ShiftTemplate,
} from '../domain/types';
import { addDays, splitShiftTime, templateById } from '../utils/schedule';

type UseShiftManagementOptions = {
  days: string[];
  employees: Employee[];
  isManager: boolean;
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setSchedule: Dispatch<SetStateAction<ScheduleState>>;
  storeId: string;
  templates: ShiftTemplate[];
  visibleShifts: Shift[];
};

export function useShiftManagement({
  days,
  employees,
  isManager,
  selectedDate,
  setSelectedDate,
  setSchedule,
  storeId,
  templates,
  visibleShifts,
}: UseShiftManagementOptions) {
  const [draft, setDraft] = useState<DraftShift>(() => createInitialDraft(selectedDate));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingShiftId, setDraggingShiftId] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isQuickShiftEntry, setIsQuickShiftEntry] = useState(false);
  const [pendingEmployeeDrop, setPendingEmployeeDrop] =
    useState<PendingEmployeeDrop | null>(null);
  const [shiftTimeError, setShiftTimeError] = useState('');
  const dragTemplates = employeeDropTemplateIds.flatMap((templateId) => {
    const template = templates.find((item) => item.id === templateId);
    return template ? [template] : [];
  });

  useEffect(() => {
    if (!days.includes(selectedDate)) {
      setSelectedDate(days[0]);
      setDraft((current) => ({ ...current, date: days[0] }));
    }
  }, [days, selectedDate, setSelectedDate]);

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
      templateId: current.templateId,
      time: current.time,
    }));
  }

  function submitShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isManager) return;

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
    setIsQuickShiftEntry(false);
  }

  function editShift(shift: Shift) {
    if (!isManager) return;

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

  function deleteShift() {
    if (!editingId || !isManager) return;
    removeShift(editingId);
    setShowShiftModal(false);
  }

  function closeShiftModal() {
    setShowShiftModal(false);
    setIsQuickShiftEntry(false);
    setShiftTimeError('');
    resetDraft();
  }

  function removeShift(shiftId: string) {
    if (!isManager) return;

    setSchedule((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== shiftId),
    }));
    if (editingId === shiftId) resetDraft();
    setDraggingShiftId(null);
  }

  function moveShiftToDate(shiftId: string, date: string) {
    if (!isManager) return;

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
    if (!isManager) return;

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

  function addDraggedEmployee(employeeId: string, date: string) {
    if (!isManager) return;
    setSelectedDate(date);
    setPendingEmployeeDrop({ employeeId, date });
  }

  function selectDroppedEmployeeTemplate(templateId: string) {
    if (!isManager || !pendingEmployeeDrop) return;

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

    setSchedule((current) => ({
      ...current,
      shifts: [
        ...current.shifts,
        {
          id: crypto.randomUUID(),
          storeId,
          date: pendingEmployeeDrop.date,
          employeeId: pendingEmployeeDrop.employeeId,
          templateId: selectedTemplate.id,
          time: selectedTemplate.time,
        },
      ],
    }));
    setPendingEmployeeDrop(null);
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
  };
}
