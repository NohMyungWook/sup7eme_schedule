import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { templateColors } from '../../domain/data';
import type { ShiftTemplate, TemplateDraft } from '../../domain/types';
import { TimePicker } from '../common/TimePicker';
import { SettingsIcon } from './SettingsIcon';

type TimeTemplateSettingsProps = {
  templates: ShiftTemplate[];
  draft: TemplateDraft;
  editingTemplateId: string | null;
  setDraft: Dispatch<SetStateAction<TemplateDraft>>;
  onBack: () => void;
  onEdit: (template: ShiftTemplate) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TimeTemplateSettings({
  templates,
  draft,
  editingTemplateId,
  setDraft,
  onBack,
  onEdit,
  onReset,
  onSubmit,
}: TimeTemplateSettingsProps) {
  return (
    <>
      <header className="time-settings-header"><button className="settings-back-button" type="button" onClick={onBack}>설정</button><span>/</span><strong>시간대 설정</strong><h1>시간대 설정</h1><p>스케줄에서 사용하는 시간대와 기본 색상을 관리합니다.</p></header>
      <div className="template-settings-layout">
        <section className="template-settings-list-panel">
          <div className="template-settings-toolbar">
            <div><strong>등록된 시간대</strong><span>{templates.length}개</span></div>
            <button className="primary template-add-button" type="button" onClick={onReset}>+ 시간대 추가</button>
          </div>
          <div className="template-settings-list">
            {templates.map((template, index) => (
              <article className={`template-settings-card ${editingTemplateId === template.id ? 'is-selected' : ''}`} key={template.id} onClick={() => onEdit(template)}>
                <span className={`template-time-dot ${template.color}`} aria-hidden="true"><i /></span>
                <div className="template-settings-main"><div><strong>{template.label}</strong><em className={template.color}>{template.requiresTimeInput ? '직접입력' : '기본'}</em></div><span>{template.requiresTimeInput ? '직접입력' : template.time}</span></div>
                <div className="template-settings-usage"><span><SettingsIcon name="users" /> 직원 기본 근무 {Math.max(2, 8 - index)}명 사용</span><span>스케줄 {Math.max(4, 32 - index * 5)}건에 적용</span></div>
              </article>
            ))}
          </div>
          <div className="template-pagination"><button type="button">‹</button><strong>1</strong><button type="button">›</button></div>
        </section>
        <form className="template-settings-form" onSubmit={onSubmit}>
          <div><h2>{editingTemplateId ? '시간대 수정' : '새 시간대 추가'}</h2><p>시작과 종료 시간은 분 단위로 설정할 수 있습니다.</p></div>
          <label>시간대 이름<input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="예: 오전 보조" required /></label>
          <div className="template-time-fields">
            <label>시작 시간<TimePicker value={draft.startTime} onChange={(startTime) => setDraft((current) => ({ ...current, startTime }))} ariaLabel="시간대 시작 시간" disabled={draft.requiresTimeInput} /></label>
            <span>~</span>
            <label>종료 시간<TimePicker value={draft.endTime} onChange={(endTime) => setDraft((current) => ({ ...current, endTime }))} ariaLabel="시간대 종료 시간" disabled={draft.requiresTimeInput} /></label>
          </div>
          <label className="template-direct-input-toggle"><input type="checkbox" checked={draft.requiresTimeInput} onChange={(event) => setDraft((current) => ({ ...current, requiresTimeInput: event.target.checked }))} /><span>직접 입력 허용</span></label>
          <fieldset className="template-color-field">
            <legend>표시 색상</legend>
            {templateColors.map((color) => <label className={color.value} key={color.value} aria-label={`${color.label} 색상`}><input type="radio" name="template-color" value={color.value} checked={draft.color === color.value} onChange={() => setDraft((current) => ({ ...current, color: color.value }))} /><span>{color.label}</span></label>)}
          </fieldset>
          <div className="template-preview"><span>미리보기</span><div className={`template-preview-card ${draft.color}`}><span className={`template-time-dot ${draft.color}`} aria-hidden="true"><i /></span><div><strong>{draft.label || '시간대 이름'}</strong><small>{draft.requiresTimeInput ? '직접입력' : `${draft.startTime}-${draft.endTime}`}</small></div><em>{draft.requiresTimeInput ? '직접 입력' : '기본'}</em></div><p>미리보기는 스케줄 화면에서의 표시 예시입니다.</p></div>
          <div className="form-actions">
            <button type="button" onClick={onReset}>{editingTemplateId ? '취소' : '초기화'}</button>
            <button className="primary" type="submit" disabled={!draft.label.trim() || (!draft.requiresTimeInput && draft.startTime === draft.endTime)}>{editingTemplateId ? '변경 저장' : '시간대 추가'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
