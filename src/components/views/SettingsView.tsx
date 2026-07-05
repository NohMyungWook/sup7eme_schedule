import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { templateColors } from '../../domain/data';
import type { ShiftTemplate, TemplateDraft } from '../../domain/types';

type SettingsViewProps = {
  templates: ShiftTemplate[];
  draft: TemplateDraft;
  editingTemplateId: string | null;
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onEdit: (template: ShiftTemplate) => void;
  onDelete: (templateId: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SettingsView({ templates, draft, editingTemplateId, setDraft, onEdit, onDelete, onReset, onSubmit }: SettingsViewProps) {
  return (
    <>
      <header className="employee-page-header"><div><h1>시간대 설정</h1><p>스케줄에서 사용하는 근무 이름, 기본 시간과 색상을 관리합니다.</p></div></header>
      <div className="template-settings-layout">
        <section className="template-settings-list">
          {templates.map((template) => (
            <article className={`template-settings-card ${template.color}`} key={template.id}>
              <div><span>{template.label}</span><strong>{template.time}</strong></div>
              <div className="template-settings-actions">
                <button type="button" onClick={() => onEdit(template)}>수정</button>
                <button className="danger" type="button" disabled={templates.length <= 1} onClick={() => onDelete(template.id)}>삭제</button>
              </div>
            </article>
          ))}
        </section>
        <form className="template-settings-form" onSubmit={onSubmit}>
          <div><h2>{editingTemplateId ? '시간대 수정' : '새 시간대 추가'}</h2><p>시작과 종료 시간은 분 단위로 설정할 수 있습니다.</p></div>
          <label>시간대 이름<input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="예: 오전 보조" required /></label>
          <div className="template-time-fields">
            <label>시작 시간<input type="time" step="60" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} required /></label>
            <span>~</span>
            <label>종료 시간<input type="time" step="60" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} required /></label>
          </div>
          <fieldset className="template-color-field">
            <legend>표시 색상</legend>
            {templateColors.map((color) => <label className={color.value} key={color.value}><input type="radio" name="template-color" value={color.value} checked={draft.color === color.value} onChange={() => setDraft((current) => ({ ...current, color: color.value }))} /><span>{color.label}</span></label>)}
          </fieldset>
          <div className="template-preview"><span>미리보기</span><div className={`template-chip ${draft.color}`}><span>{draft.label || '시간대 이름'}</span><strong>{draft.startTime}-{draft.endTime}</strong></div></div>
          <div className="form-actions">
            <button type="button" onClick={onReset}>{editingTemplateId ? '취소' : '초기화'}</button>
            <button className="primary" type="submit" disabled={!draft.label.trim() || draft.startTime === draft.endTime}>{editingTemplateId ? '변경 저장' : '시간대 추가'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
