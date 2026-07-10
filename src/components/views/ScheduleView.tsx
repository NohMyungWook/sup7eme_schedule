import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { DraftShift, Employee, PendingEmployeeDrop, Shift, ShiftTemplate, Store } from '../../domain/types';
import { dayLabel, employeeName, formatDate, formatKoreanRange, sortByTime, templateById } from '../../utils/schedule';
import { StoreSelect } from '../common/StoreSelect';
import { ShiftModal } from './ShiftModal';
import { EmployeeShiftPickerModal } from './EmployeeShiftPickerModal';

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

  return (
    <>
      <header className="topbar"><StoreSelect stores={props.stores} value={props.storeId} onChange={props.onStoreChange} ariaLabel="매장 선택" /></header>
      <div className="weekbar">
        <button type="button" onClick={() => props.onMoveWeek(-1)} aria-label="이전 주"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button><h1>{formatKoreanRange(props.days)}</h1><button type="button" onClick={() => props.onMoveWeek(1)} aria-label="다음 주"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
        {props.isManager ? <div className="week-actions"><button type="button" onClick={props.onCopyPreviousWeek}>지난주 복사</button><button type="button" className="primary" onClick={props.onGenerateBaseWeek}>기본 주 생성</button></div> : null}
      </div>
      {props.generationMessage ? <p className="generation-message" role="status">{props.generationMessage}</p> : null}
      <div className="schedule-scroll"><section className="schedule-grid" aria-label="주간 스케줄">
        {props.days.map((date) => {
          const dayShifts = sortByTime(props.visibleShifts.filter((shift) => shift.date === date));
          return (
            <article className={`day-column ${props.selectedDate === date ? 'is-focused' : ''} ${today === date ? 'is-today' : ''}`} key={date}
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
                  return <article className={`shift-card ${template.color} ${props.draggingShiftId === shift.id ? 'is-dragging' : ''}`} draggable={props.isManager} key={shift.id} onDragEnd={() => props.setDraggingShiftId(null)} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-kingmw-shift', shift.id); props.setDraggingShiftId(shift.id); }}><button className="shift-card-main" type="button" aria-label={`${name} ${shift.time}${shift.note ? `, ${shift.note}` : ''}`} title={shift.note || undefined} onClick={(event) => { event.stopPropagation(); props.onShiftEdit(shift); }}><strong>{name}</strong><span>{shift.time}</span></button></article>;
                })}
              </div>
            </article>
          );
        })}
      </section></div>
      {props.isManager ? <section className="schedule-employee-panel" aria-labelledby="schedule-employee-title"><div className="schedule-employee-heading"><h2 id="schedule-employee-title">현재 매장 직원</h2><span>날짜 칸으로 드래그해 근무 추가</span></div><div className="schedule-employee-list">{props.storeEmployees.map((employee) => <article className={`employee-card ${props.selectedEmployeeId === employee.id ? 'is-selected' : ''}`} draggable key={employee.id} onClick={() => props.onEmployeeSelect(employee.id)} onDragStart={(event) => event.dataTransfer.setData('application/x-kingmw-employee', employee.id)}><span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span><div><strong>{employee.name}</strong></div></article>)}{!props.storeEmployees.length ? <p className="empty-employees">직원 탭에서 이 매장 직원을 등록하세요.</p> : null}</div></section> : null}
      {props.isManager ? <aside className="tips-card schedule-tips"><h2>편집 팁</h2><ul><li>직원 카드를 날짜 칸으로 드래그한 뒤 근무 시간대를 선택합니다.</li><li>오후 변동과 교육은 시간대를 선택한 다음 직접 시간을 입력합니다.</li><li>근무 카드를 누르면 시간, 직원, 메모를 바로 수정할 수 있습니다.</li><li>기본 주 생성은 직원 탭에서 등록한 요일별 기본 근무만 채웁니다.</li></ul></aside> : null}
      {props.pendingEmployeeDrop && props.isManager ? <EmployeeShiftPickerModal employeeName={employeeName(props.pendingEmployeeDrop.employeeId, props.employees)} date={props.pendingEmployeeDrop.date} templates={props.dragTemplates} onSelect={props.onDropTemplateSelect} onClose={props.onDropPickerClose} /> : null}
      {props.showModal && props.isManager ? <ShiftModal compact={props.isQuickShiftEntry} days={props.days} employees={props.storeEmployees} templates={props.templates} draft={props.draft} editingId={props.editingId} timeError={props.timeError} setDraft={props.setDraft} onTemplateSelect={props.onTemplateSelect} onTimeChange={props.onTimeChange} onDelete={props.onShiftDelete} onClose={props.onModalClose} onSubmit={props.onShiftSubmit} /> : null}
    </>
  );
}
