import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { DraftShift, Employee, ShiftTemplate } from '../../domain/types';
import { dayLabel, splitShiftTime } from '../../utils/schedule';
import { Dropdown } from '../common/Dropdown';
import { TimePicker } from '../common/TimePicker';

type ShiftModalProps = {
  compact?: boolean;
  days: string[];
  employees: Employee[];
  templates: ShiftTemplate[];
  draft: DraftShift;
  editingId: string | null;
  canDelete: boolean;
  canSubmit: boolean;
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
  const isEditing = Boolean(props.editingId);
  const employee = props.employees.find((item) => item.id === props.draft.employeeId);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
      <form className={`shift-modal ${props.compact ? 'is-compact' : ''} ${isEditing ? 'is-editing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="shift-modal-title" onSubmit={props.onSubmit}>
        <div className="shift-modal-heading"><div><h2 id="shift-modal-title">{props.compact ? '오후 근무 추가' : isEditing ? '근무 시간 변경' : '새 근무 추가'}</h2>{props.compact ? null : <p>{isEditing ? `${employee?.name ?? '직원'} · ${dayLabel(props.draft.date)}` : `${dayLabel(props.draft.date)} 근무 정보를 입력하세요.`}</p>}</div>{props.compact ? null : <button type="button" onClick={props.onClose}>닫기</button>}</div>
        <div className="shift-modal-fields">
          {props.compact || isEditing ? null : <><label>날짜<Dropdown value={props.draft.date} options={props.days.map((date) => ({ value: date, label: dayLabel(date) }))} onChange={(date) => props.setDraft((current) => ({ ...current, date }))} /></label><label>직원<Dropdown value={props.draft.employeeId} options={props.employees.map((employee) => ({ value: employee.id, label: employee.name }))} onChange={(employeeId) => props.setDraft((current) => ({ ...current, employeeId }))} /></label><label>시간대<Dropdown value={props.draft.templateId} options={props.templates.map((template) => ({ value: template.id, label: template.label }))} onChange={props.onTemplateSelect} /></label></>}
          <div className="shift-time-range">
            <label>시작 시간<TimePicker value={shiftTime.startTime} onChange={(value) => props.onTimeChange('start', value)} ariaLabel="시작 시간" /></label><span aria-hidden="true">~</span>
            <label>종료 시간<TimePicker value={shiftTime.endTime} onChange={(value) => props.onTimeChange('end', value)} ariaLabel="종료 시간" /></label>
          </div>
          {props.timeError ? <p className="shift-time-error" role="alert">{props.timeError}</p> : null}
          {isEditing ? null : <label className="shift-modal-note">메모{props.compact ? <textarea value={props.draft.note} onChange={(event) => props.setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="대타, 연장 등 전달할 내용을 입력하세요." rows={3} /> : <input value={props.draft.note} onChange={(event) => props.setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="교육, 대타, 연장 등" />}</label>}
        </div>
        <div className="form-actions">
          {props.editingId && props.canDelete ? <button className="danger" type="button" onClick={props.onDelete}>근무 삭제</button> : <button type="button" onClick={props.onClose}>취소</button>}
          <button className="primary" type="submit" disabled={!props.canSubmit}>{props.editingId ? '변경 저장' : '근무 추가'}</button>
        </div>
      </form>
    </div>
  );
}
