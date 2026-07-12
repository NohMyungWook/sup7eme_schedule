import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { DraftShift, Employee, PendingEmployeeDrop, Shift, ShiftTemplate, Store } from '../../domain/types';
import { colorClassName, customColorStyle } from '../../utils/color';
import { dayLabel, employeeName, formatDate, formatKoreanRange, getMonthDays, sortByTime, templateById, toDate } from '../../utils/schedule';
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
  isManager: boolean;
  selectedEmployeeId?: string;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setSelectedDate: (date: string) => void;
  setDraggingShiftId: (id: string | null) => void;
  onStoreChange: (storeId: string) => void;
  onDateSelect: (date: string) => void;
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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [visibleMonth, setVisibleMonth] = useState(() => props.selectedDate.slice(0, 7));
  const monthDays = getMonthDays(visibleMonth);
  const monthStartOffset = toDate(monthDays[0]).getDay();
  const monthCells = [
    ...Array.from({ length: monthStartOffset }, () => null),
    ...monthDays,
  ];
  const monthLabel = `${Number(visibleMonth.slice(0, 4))}년 ${Number(visibleMonth.slice(5, 7))}월`;

  function handleEmployeeTouchEnd(touch: { clientX: number; clientY: number }) {
    if (!touchEmployeeId) return;
    const dropTarget = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>('[data-schedule-date]');
    const date = dropTarget?.dataset.scheduleDate;
    if (date) props.onEmployeeDrop(touchEmployeeId, date);
    setTouchEmployeeId(null);
  }

  function moveMonth(direction: -1 | 1) {
    const [year, month] = visibleMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + direction, 1, 12);
    setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  function openWeekFromMonth(date: string) {
    setViewMode('week');
    setVisibleMonth(date.slice(0, 7));
    props.onDateSelect(date);
  }

  function selectWeekMode() {
    setViewMode('week');
    setVisibleMonth(props.selectedDate.slice(0, 7));
  }

  return (
    <>
      <header className="topbar"><StoreSelect stores={props.stores} value={props.storeId} onChange={props.onStoreChange} ariaLabel="매장 선택" /></header>
      <div className="weekbar">
        <button type="button" onClick={() => viewMode === 'week' ? props.onMoveWeek(-1) : moveMonth(-1)} aria-label={viewMode === 'week' ? '이전 주' : '이전 달'}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button><h1>{viewMode === 'week' ? formatKoreanRange(props.days) : monthLabel}</h1><button type="button" onClick={() => viewMode === 'week' ? props.onMoveWeek(1) : moveMonth(1)} aria-label={viewMode === 'week' ? '다음 주' : '다음 달'}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
        <div className="schedule-view-toggle" aria-label="스케줄 보기 전환">
          <button type="button" className={viewMode === 'week' ? 'is-active' : undefined} onClick={selectWeekMode} aria-label="주간보기">
            <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M9 10v9M15 10v9" /></svg>
          </button>
          <button type="button" className={viewMode === 'month' ? 'is-active' : undefined} onClick={() => setViewMode('month')} aria-label="월별보기">
            <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" /></svg>
          </button>
        </div>
        {props.isManager && viewMode === 'week' ? <div className="week-actions"><button type="button" onClick={props.onCopyPreviousWeek}>지난주 복사</button><button type="button" className="primary" onClick={props.onGenerateBaseWeek}>기본 주 생성</button></div> : null}
      </div>
      {props.generationMessage ? <p className="generation-message" role="status">{props.generationMessage}</p> : null}
      {viewMode === 'week' ? <div className="schedule-scroll"><section className="schedule-grid" aria-label="주간 스케줄">
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
                  return <article className={`shift-card ${colorClassName(template.color)} ${props.draggingShiftId === shift.id ? 'is-dragging' : ''}`} style={customColorStyle(template.color)} draggable={props.isManager} key={shift.id} onDragEnd={() => props.setDraggingShiftId(null)} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-kingmw-shift', shift.id); props.setDraggingShiftId(shift.id); }}><button className="shift-card-main" type="button" aria-label={`${name} ${shift.time}${shift.note ? `, ${shift.note}` : ''}`} title={shift.note || undefined} onClick={(event) => { event.stopPropagation(); props.onShiftEdit(shift); }}><strong>{name}</strong><span>{shift.time}</span></button></article>;
                })}
              </div>
            </article>
          );
        })}
      </section></div> : (
        <section className="month-schedule" aria-label="월별 스케줄">
          <div className="month-weekdays" aria-hidden="true">
            {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="month-calendar-grid">
            {monthCells.map((date, index) => {
              if (!date) return <div className="month-day is-empty" key={`empty-${index}`} />;
              const dayShifts = sortByTime(props.visibleShifts.filter((shift) => shift.date === date));
              return (
                <button
                  type="button"
                  className={`month-day ${today === date ? 'is-today' : ''} ${props.selectedDate === date ? 'is-selected' : ''}`}
                  key={date}
                  onClick={() => openWeekFromMonth(date)}
                >
                  <span className="month-day-number">{toDate(date).getDate()}</span>
                  <div className="month-shift-stack">
                    {dayShifts.map((shift) => {
                      const template = templateById(shift.templateId, props.templates);
                      return (
                        <span className={`month-shift-pill ${colorClassName(template.color)}`} style={customColorStyle(template.color)} key={shift.id}>
                          <strong>{employeeName(shift.employeeId, props.employees)}</strong>
                          <small>{shift.time}</small>
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {props.isManager && viewMode === 'week' ? <ScheduleEmployeePool employees={props.storeEmployees} selectedEmployeeId={props.selectedEmployeeId} onEmployeeSelect={props.onEmployeeSelect} onTouchDragStart={setTouchEmployeeId} onTouchDragEnd={handleEmployeeTouchEnd} /> : null}
      {props.pendingEmployeeDrop && props.isManager ? <EmployeeShiftPickerModal employeeName={employeeName(props.pendingEmployeeDrop.employeeId, props.employees)} date={props.pendingEmployeeDrop.date} templates={props.dragTemplates} onSelect={props.onDropTemplateSelect} onClose={props.onDropPickerClose} /> : null}
      {props.showModal && props.isManager ? <ShiftModal compact={props.isQuickShiftEntry} days={props.days} employees={props.storeEmployees} templates={props.templates} draft={props.draft} editingId={props.editingId} timeError={props.timeError} setDraft={props.setDraft} onTemplateSelect={props.onTemplateSelect} onTimeChange={props.onTimeChange} onDelete={props.onShiftDelete} onClose={props.onModalClose} onSubmit={props.onShiftSubmit} /> : null}
    </>
  );
}
