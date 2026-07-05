import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { DraftShift, Employee, ShiftTemplate } from '../../domain/types';
import { dayLabel, splitShiftTime } from '../../utils/schedule';

type ShiftModalProps = {
  days: string[];
  employees: Employee[];
  templates: ShiftTemplate[];
  draft: DraftShift;
  editingId: string | null;
  timeError: string;
  setDraft: Dispatch<SetStateAction<DraftShift>>;
  onTemplateSelect: (templateId: string) => void;
  onTimeChange: (part: 'start' | 'end', value: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ShiftModal(props: ShiftModalProps) {
  const shiftTime = splitShiftTime(props.draft.time);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
      <form className="shift-modal" role="dialog" aria-modal="true" aria-labelledby="shift-modal-title" onSubmit={props.onSubmit}>
        <div className="shift-modal-heading"><div><h2 id="shift-modal-title">{props.editingId ? '근무 수정' : '새 근무 추가'}</h2><p>{dayLabel(props.draft.date)} 근무 정보를 입력하세요.</p></div><button type="button" onClick={props.onClose}>닫기</button></div>
        <div className="shift-modal-fields">
          <label>날짜<select value={props.draft.date} onChange={(event) => props.setDraft((current) => ({ ...current, date: event.target.value }))}>{props.days.map((date) => <option key={date} value={date}>{dayLabel(date)}</option>)}</select></label>
          <label>직원<select value={props.draft.employeeId} onChange={(event) => props.setDraft((current) => ({ ...current, employeeId: event.target.value }))}>{props.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <label>시간대<select value={props.draft.templateId} onChange={(event) => props.onTemplateSelect(event.target.value)}>{props.templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</select></label>
          <div className="shift-time-range">
            <label>시작 시간<input type="time" step="60" value={shiftTime.startTime} onChange={(event) => props.onTimeChange('start', event.target.value)} required /></label><span aria-hidden="true">~</span>
            <label>종료 시간<input type="time" step="60" value={shiftTime.endTime} onChange={(event) => props.onTimeChange('end', event.target.value)} required /></label>
          </div>
          {props.timeError ? <p className="shift-time-error" role="alert">{props.timeError}</p> : null}
          <label className="shift-modal-note">메모<input value={props.draft.note} onChange={(event) => props.setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="교육, 대타, 연장 등" /></label>
        </div>
        <div className="form-actions">
          {props.editingId ? <button className="danger" type="button" onClick={props.onDelete}>근무 삭제</button> : <button type="button" onClick={props.onClose}>취소</button>}
          <button className="primary" type="submit">{props.editingId ? '변경 저장' : '근무 추가'}</button>
        </div>
      </form>
    </div>
  );
}
