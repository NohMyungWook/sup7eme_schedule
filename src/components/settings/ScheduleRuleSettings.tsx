import { useEffect, useState, type FormEvent } from 'react';
import { weekdays } from '../../domain/data';
import type { ShiftTemplate, Store } from '../../domain/types';
import { deleteScheduleRule, fetchScheduleRules, saveScheduleRule, type ScheduleRule } from '../../services/scheduleRuleApi';
import { Dropdown } from '../common/Dropdown';
import { ListSkeleton } from '../common/Skeleton';
import { TimePicker } from '../common/TimePicker';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

type Props = { stores: Store[]; templates: ShiftTemplate[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean; onBack: () => void };
type RuleDraft = Omit<ScheduleRule, 'id'> & { id?: string };

export function ScheduleRuleSettings({ stores, templates, canCreate, canUpdate, canDelete, onBack }: Props) {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [draft, setDraft] = useState<RuleDraft>(() => createDraft(stores[0]?.id, templates[0]));
  const [filterStoreId, setFilterStoreId] = useState(stores[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const refreshRevision = useFocusRefresh();
  const filtered = rules.filter((rule) => !filterStoreId || rule.storeId === filterStoreId);

  useEffect(() => { let mounted = true; setIsLoading(true); fetchScheduleRules().then((next) => { if (mounted) setRules(next); }).catch((error: Error) => { if (mounted) setMessage(error.message); }).finally(() => { if (mounted) setIsLoading(false); }); return () => { mounted = false; }; }, [refreshRevision]);

  function selectTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    const [startTime = '08:00', endTime = '15:00'] = template?.time.split('-') ?? [];
    setDraft((current) => ({ ...current, templateId, startTime, endTime }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.id ? !canUpdate : !canCreate) return;
    setIsSaving(true); setMessage('');
    try {
      const saved = await saveScheduleRule(draft);
      setRules((current) => draft.id ? current.map((rule) => rule.id === draft.id ? saved : rule) : [...current, saved]);
      setDraft(createDraft(filterStoreId || stores[0]?.id, templates[0]));
      setMessage('스케줄 규칙을 저장했습니다.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '스케줄 규칙을 저장하지 못했습니다.'); }
    finally { setIsSaving(false); }
  }

  async function remove(rule: ScheduleRule) {
    if (!canDelete || !window.confirm('이 필요 인원 규칙을 비활성화할까요?')) return;
    setIsSaving(true); setMessage('');
    try { await deleteScheduleRule(rule.id); setRules((current) => current.filter((item) => item.id !== rule.id)); if (draft.id === rule.id) setDraft(createDraft(rule.storeId, templates[0])); }
    catch (error) { setMessage(error instanceof Error ? error.message : '스케줄 규칙을 삭제하지 못했습니다.'); }
    finally { setIsSaving(false); }
  }

  return <><header className="settings-detail-header"><button className="settings-back-button" type="button" onClick={onBack}>← 설정으로 돌아가기</button><div><h1>스케줄 규칙</h1><p>요일과 시간대별 최소 필요 인원을 설정합니다.</p></div></header><div className="schedule-rule-layout"><section className="schedule-rule-list"><header><h2>필요 인원 규칙</h2><Dropdown value={filterStoreId} onChange={setFilterStoreId} options={stores.map((store) => ({ value: store.id, label: store.name }))} ariaLabel="규칙 근무지 필터" /></header>{isLoading ? <ListSkeleton rows={5} /> : filtered.map((rule) => <article key={rule.id}><button type="button" onClick={() => setDraft({ ...rule })}><span><strong>{weekdays[rule.weekday]}요일 · {rule.startTime}-{rule.endTime}</strong><small>{rule.storeName || stores.find((store) => store.id === rule.storeId)?.name} · {rule.templateLabel || '직접 시간'}</small></span><b>최소 {rule.minimumStaff}명</b></button>{canDelete ? <button type="button" onClick={() => remove(rule)} disabled={isSaving}>삭제</button> : null}</article>)}{!isLoading && !filtered.length ? <p className="settings-empty-state">등록된 규칙이 없습니다. 규칙이 없으면 대시보드에서 빈 시간을 임의 계산하지 않습니다.</p> : null}</section><aside className="schedule-rule-editor"><form onSubmit={submit}><h2>{draft.id ? '규칙 수정' : '규칙 추가'}</h2><label>근무지<Dropdown value={draft.storeId} onChange={(storeId) => setDraft((current) => ({ ...current, storeId }))} options={stores.map((store) => ({ value: store.id, label: store.name }))} /></label><label>요일<Dropdown value={String(draft.weekday)} onChange={(weekday) => setDraft((current) => ({ ...current, weekday: Number(weekday) }))} options={weekdays.map((label, value) => ({ value: String(value), label: `${label}요일` }))} /></label><label>기준 시간대<Dropdown value={draft.templateId ?? ''} onChange={selectTemplate} options={[{ value: '', label: '직접 시간' }, ...templates.map((template) => ({ value: template.id, label: template.label }))]} /></label><div className="schedule-rule-times"><label>시작<TimePicker value={draft.startTime} onChange={(startTime) => setDraft((current) => ({ ...current, startTime }))} /></label><label>종료<TimePicker value={draft.endTime} onChange={(endTime) => setDraft((current) => ({ ...current, endTime }))} /></label></div><label>최소 필요 인원<input type="number" min={1} max={100} value={draft.minimumStaff} onChange={(event) => setDraft((current) => ({ ...current, minimumStaff: Number(event.target.value) }))} /></label>{message ? <p role="status">{message}</p> : null}<div><button type="button" onClick={() => setDraft(createDraft(filterStoreId || stores[0]?.id, templates[0]))}>취소</button><button className="primary" type="submit" disabled={isSaving || (draft.id ? !canUpdate : !canCreate)}>{isSaving ? '저장 중...' : '저장'}</button></div></form></aside></div></>;
}

function createDraft(storeId = '', template?: ShiftTemplate): RuleDraft {
  const [startTime = '08:00', endTime = '15:00'] = template?.time.split('-') ?? [];
  return { storeId, weekday: 1, templateId: template?.id ?? null, startTime, endTime, minimumStaff: 1 };
}
