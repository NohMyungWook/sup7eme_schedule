import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { DayNote, DraftShift, Employee, Shift, ShiftTemplate } from '../../domain/types';
import { dayLabel, employeeName, formatKoreanRange, sortByTime, templateById } from '../../utils/schedule';
import { StoreSelect } from '../common/StoreSelect';
import { ShiftModal } from './ShiftModal';

type ScheduleViewProps = {
  storeId: string;
  days: string[];
  employees: Employee[];
  storeEmployees: Employee[];
  visibleShifts: Shift[];
  templates: ShiftTemplate[];
  selectedDate: string;
  selectedNote?: DayNote;
  noteDraft: string;
  draft: DraftShift;
  editingId: string | null;
  draggingShiftId: string | null;
  generationMessage: string;
  showModal: boolean;
  timeError: string;
  isManager: boolean;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  setSelectedDate: (date: string) => void;
  setNoteDraft: (text: string) => void;
  setDraggingShiftId: (id: string | null) => void;
  onStoreChange: (storeId: string) => void;
  onMoveWeek: (direction: -1 | 1) => void;
  onCopyPreviousWeek: () => void;
  onGenerateBaseWeek: () => void;
  onTemplateSelect: (templateId: string) => void;
  onShiftMove: (shiftId: string, date: string) => void;
  onEmployeeDrop: (employeeId: string, date: string) => void;
  onShiftEdit: (shift: Shift) => void;
  onShiftAdd: (date: string) => void;
  onShiftRemove: (shiftId: string) => void;
  onNoteSave: () => void;
  onTimeChange: (part: 'start' | 'end', value: string) => void;
  onShiftDelete: () => void;
  onModalClose: () => void;
  onShiftSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ScheduleView(props: ScheduleViewProps) {
  return (
    <>
      <header className="topbar"><StoreSelect value={props.storeId} onChange={props.onStoreChange} ariaLabel="매장 선택" /></header>
      <div className="weekbar">
        <button type="button" onClick={() => props.onMoveWeek(-1)} aria-label="이전 주">‹</button><h1>{formatKoreanRange(props.days)}</h1><button type="button" onClick={() => props.onMoveWeek(1)} aria-label="다음 주">›</button>
        {props.isManager ? <div className="week-actions"><button type="button" onClick={props.onCopyPreviousWeek}>지난주 복사</button><button type="button" className="primary" onClick={props.onGenerateBaseWeek}>기본 주 생성</button></div> : null}
      </div>
      {props.generationMessage ? <p className="generation-message" role="status">{props.generationMessage}</p> : null}
      {props.isManager ? <div className="template-row">{props.templates.map((template) => <button className={`template-chip ${template.color} ${props.draft.templateId === template.id ? 'is-picked' : ''}`} key={template.id} type="button" onClick={() => props.onTemplateSelect(template.id)}><span>{template.label}</span><strong>{template.time}</strong></button>)}</div> : null}
      <section className="schedule-grid" aria-label="주간 스케줄">
        {props.days.map((date) => {
          const dayShifts = sortByTime(props.visibleShifts.filter((shift) => shift.date === date));
          return (
            <article className={`day-column ${props.selectedDate === date ? 'is-focused' : ''}`} key={date}
              onClick={() => { props.setSelectedDate(date); props.setDraft((current) => ({ ...current, date })); }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const shiftId = event.dataTransfer.getData('application/x-kingmw-shift');
                if (shiftId) return props.onShiftMove(shiftId, date);
                const employeeId = event.dataTransfer.getData('application/x-kingmw-employee');
                if (employeeId) props.onEmployeeDrop(employeeId, date);
              }}>
              <header><strong>{dayLabel(date)}</strong></header>
              <div className="shift-stack">
                {dayShifts.map((shift) => {
                  const template = templateById(shift.templateId, props.templates);
                  return <article className={`shift-card ${template.color} ${props.draggingShiftId === shift.id ? 'is-dragging' : ''}`} draggable={props.isManager} key={shift.id} onDragEnd={() => props.setDraggingShiftId(null)} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-kingmw-shift', shift.id); props.setDraggingShiftId(shift.id); }}><button className="shift-card-main" type="button" onClick={(event) => { event.stopPropagation(); props.onShiftEdit(shift); }}><span>{shift.time}</span><strong>{employeeName(shift.employeeId, props.employees)}</strong>{shift.note ? <small>{shift.note}</small> : null}</button></article>;
                })}
              </div>
              {props.isManager ? <button className="add-shift" type="button" onClick={(event) => { event.stopPropagation(); props.onShiftAdd(date); }}>+ 근무 추가</button> : null}
            </article>
          );
        })}
      </section>
      {props.isManager ? <div className={`shift-trash ${props.draggingShiftId ? 'is-active' : ''}`} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-kingmw-shift')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={(event) => { event.preventDefault(); const shiftId = event.dataTransfer.getData('application/x-kingmw-shift'); if (shiftId) props.onShiftRemove(shiftId); }}><strong>근무 삭제</strong><span>삭제할 근무 카드를 이곳으로 드래그하세요.</span></div> : null}
      <section className="note-card">
        <div><h2>{dayLabel(props.selectedDate)} 특이사항</h2>{props.selectedNote?.text ? <ul>{props.selectedNote.text.split('\n').map((line) => <li key={line}>{line}</li>)}</ul> : <p>등록된 특이사항이 없습니다.</p>}</div>
        {props.isManager ? <div className="note-editor"><textarea value={props.noteDraft} onChange={(event) => props.setNoteDraft(event.target.value)} rows={3} placeholder="예: 한가하면 청소 + 퇴근 조율" /><button type="button" onClick={props.onNoteSave}>저장</button></div> : null}
      </section>
      {props.isManager ? <aside className="tips-card schedule-tips"><h2>편집 팁</h2><ul><li>직원 카드를 날짜 칸으로 드래그하면 선택된 시간대로 근무가 추가됩니다.</li><li>근무 카드를 누르면 시간, 직원, 메모를 바로 수정할 수 있습니다.</li><li>기본 주 생성은 직원 탭에서 등록한 요일별 기본 근무만 채웁니다.</li><li>특이사항은 날짜별로 저장되어 모바일 보기에도 같이 표시됩니다.</li></ul></aside> : null}
      {props.showModal && props.isManager ? <ShiftModal days={props.days} employees={props.storeEmployees} templates={props.templates} draft={props.draft} editingId={props.editingId} timeError={props.timeError} setDraft={props.setDraft} onTemplateSelect={props.onTemplateSelect} onTimeChange={props.onTimeChange} onDelete={props.onShiftDelete} onClose={props.onModalClose} onSubmit={props.onShiftSubmit} /> : null}
    </>
  );
}
