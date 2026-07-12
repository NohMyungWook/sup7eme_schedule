import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { DraftShift, Employee, PendingEmployeeDrop, Shift, ShiftTemplate, Store } from '../../domain/types';
import { dayLabel, employeeName, formatDate, formatKoreanRange, sortByTime, templateById } from '../../utils/schedule';
import { StoreSelect } from '../common/StoreSelect';
import { ShiftModal } from './ShiftModal';
import { EmployeeShiftPickerModal } from './EmployeeShiftPickerModal';
import { ScheduleEmployeePool } from './ScheduleEmployeePool';

type ScheduleViewProps = {
  storeId: string;
  stores: Store[];
  days: string[];
  employees: Employee[];
  storeEmployees: Employee[];
  visibleShifts: Shift[];
  templates: ShiftTemplate[];
  dragTemplates: ShiftTemplate[];
  pendingEmployeeDrop: PendingEmployeeDrop | null;
  selectedDate: string;
  draft: DraftShift;
  editingId: string | null;
  draggingShiftId: string | null;
  generationMessage: string;
  showModal: boolean;
  isQuickShiftEntry: boolean;
  timeError: string;
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  selectedEmployeeId?: string;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setSelectedDate: (date: string) => void;
  setDraggingShiftId: (id: string | null) => void;
  onStoreChange: (storeId: string) => void;
  onMoveWeek: (direction: -1 | 1) => void;
  onCopyPreviousWeek: () => void;
  onGenerateBaseWeek: () => void;
  onTemplateSelect: (templateId: string) => void;
  onShiftMove: (shiftId: string, date: string) => void;
  onEmployeeDrop: (employeeId: string, date: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onDropTemplateSelect: (templateId: string) => void;
  onDropPickerClose: () => void;
  onShiftEdit: (shift: Shift) => void;
  onTimeChange: (part: 'start' | 'end', value: string) => void;
  onShiftDelete: () => void;
  onModalClose: () => void;
  onShiftSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ScheduleView(props: ScheduleViewProps) {
  const today = formatDate(new Date());
  const [touchEmployeeId, setTouchEmployeeId] = useState<string | null>(null);

  function handleEmployeeTouchEnd(touch: { clientX: number; clientY: number }) {
    if (!touchEmployeeId) return;
    const dropTarget = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>('[data-schedule-date]');
    const date = dropTarget?.dataset.scheduleDate;
    if (date) props.onEmployeeDrop(touchEmployeeId, date);
    setTouchEmployeeId(null);
  }

  return (
    <>
      <header className="topbar"><StoreSelect stores={props.stores} value={props.storeId} onChange={props.onStoreChange} ariaLabel="매장 선택" /></header>
      <div className="weekbar">
        <button type="button" onClick={() => props.onMoveWeek(-1)} aria-label="이전 주"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button><h1>{formatKoreanRange(props.days)}</h1><button type="button" onClick={() => props.onMoveWeek(1)} aria-label="다음 주"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
        {props.canCreate ? <div className="week-actions"><button type="button" onClick={props.onCopyPreviousWeek}>지난주 복사</button><button type="button" className="primary" onClick={props.onGenerateBaseWeek}>기본 주 생성</button></div> : null}
      </div>
      {props.generationMessage ? <p className="generation-message" role="status">{props.generationMessage}</p> : null}
      <div className="schedule-scroll"><section className="schedule-grid" aria-label="주간 스케줄">
        {props.days.map((date) => {
          const dayShifts = sortByTime(props.visibleShifts.filter((shift) => shift.date === date));
          return (
            <article className={`day-column ${props.selectedDate === date ? 'is-focused' : ''} ${today === date ? 'is-today' : ''}`} key={date}
              data-schedule-date={date}
              onClick={() => { props.setSelectedDate(date); props.setDraft((current) => ({ ...current, date })); }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.stopPropagation();
                const shiftId = event.dataTransfer.getData('application/x-kingmw-shift');
                if (shiftId) return props.onShiftMove(shiftId, date);
                const employeeId = event.dataTransfer.getData('application/x-kingmw-employee');
                if (employeeId) props.onEmployeeDrop(employeeId, date);
              }}>
              <header><strong>{dayLabel(date)}</strong>{today === date ? <span className="today-badge">Today</span> : null}</header>
              <div className="shift-stack">
                {dayShifts.map((shift) => {
                  const template = templateById(shift.templateId, props.templates);
                  const name = employeeName(shift.employeeId, props.employees);
                  return <article className={`shift-card ${template.color} ${props.draggingShiftId === shift.id ? 'is-dragging' : ''}`} draggable={props.canUpdate} key={shift.id} onDragEnd={() => props.setDraggingShiftId(null)} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-kingmw-shift', shift.id); props.setDraggingShiftId(shift.id); }}><button className="shift-card-main" type="button" aria-label={`${name} ${shift.time}${shift.note ? `, ${shift.note}` : ''}`} title={shift.note || undefined} onClick={(event) => { event.stopPropagation(); if (props.canUpdate || props.canDelete) props.onShiftEdit(shift); }}><strong>{name}</strong><span>{shift.time}</span></button></article>;
                })}
              </div>
            </article>
          );
        })}
      </section></div>
      {props.canCreate ? <ScheduleEmployeePool employees={props.storeEmployees} selectedEmployeeId={props.selectedEmployeeId} onEmployeeSelect={props.onEmployeeSelect} onTouchDragStart={setTouchEmployeeId} onTouchDragEnd={handleEmployeeTouchEnd} /> : null}
      {props.pendingEmployeeDrop && props.canCreate ? <EmployeeShiftPickerModal employeeName={employeeName(props.pendingEmployeeDrop.employeeId, props.employees)} date={props.pendingEmployeeDrop.date} templates={props.dragTemplates} onSelect={props.onDropTemplateSelect} onClose={props.onDropPickerClose} /> : null}
      {props.showModal && (props.canCreate || props.canUpdate || props.canDelete) ? <ShiftModal compact={props.isQuickShiftEntry} days={props.days} employees={props.storeEmployees} templates={props.templates} draft={props.draft} editingId={props.editingId} canDelete={props.canDelete} canSubmit={props.editingId ? props.canUpdate : props.canCreate} timeError={props.timeError} setDraft={props.setDraft} onTemplateSelect={props.onTemplateSelect} onTimeChange={props.onTimeChange} onDelete={props.onShiftDelete} onClose={props.onModalClose} onSubmit={props.onShiftSubmit} /> : null}
    </>
  );
}
