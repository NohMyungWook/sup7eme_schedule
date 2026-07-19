import { useEffect, useState, type FormEvent } from 'react';
import type { LeaveRequest, Store } from '../../domain/types';
import { saveLeaveRequest, type LeaveDraft } from '../../services/leaveApi';
import { fetchMyShifts } from '../../services/meApi';
import { formatDate } from '../../utils/schedule';
import { Dropdown } from '../common/Dropdown';
import { TimePicker } from '../common/TimePicker';

type Props = {
  stores: Array<Pick<Store, 'id' | 'name'>>;
  editingRequest: LeaveRequest | null;
  onSaved: (request: LeaveRequest) => void;
  onCancelEdit: () => void;
};

export function EmployeeLeavePage({ stores, editingRequest, onSaved, onCancelEdit }: Props) {
  const [draft, setDraft] = useState<LeaveDraft>(() => createDraft(stores[0]?.id));
  const [hasSchedule, setHasSchedule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft(editingRequest ? {
      id: editingRequest.id,
      storeId: editingRequest.storeId,
      targetDate: editingRequest.targetDate,
      allDay: editingRequest.allDay,
      startTime: editingRequest.startTime,
      endTime: editingRequest.endTime,
      reason: editingRequest.reason,
      updatedAt: editingRequest.updatedAt,
    } : createDraft(stores[0]?.id));
  }, [editingRequest, stores]);

  useEffect(() => {
    let mounted = true;
    fetchMyShifts(draft.targetDate, draft.targetDate)
      .then((shifts) => { if (mounted) setHasSchedule(shifts.length > 0); })
      .catch(() => { if (mounted) setHasSchedule(false); });
    return () => { mounted = false; };
  }, [draft.targetDate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setMessage('');
    try {
      const result = await saveLeaveRequest(draft);
      onSaved(result.request);
      setDraft(createDraft(stores[0]?.id));
      setMessage(editingRequest ? '신청을 수정했습니다.' : '휴무 신청을 등록했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '휴무 신청을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return <section className="employee-page employee-leave-page"><header className="employee-page-heading"><div><span>휴무 · 근무 불가</span><h1>{editingRequest ? '대기 신청 수정' : '새 신청'}</h1></div></header><form onSubmit={submit}>
    <label>근무지<Dropdown value={draft.storeId} onChange={(storeId) => setDraft((current) => ({ ...current, storeId }))} options={stores.map((store) => ({ value: store.id, label: store.name }))} ariaLabel="신청 근무지" /></label>
    <label>날짜<input type="date" min={formatDate(new Date())} value={draft.targetDate} onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))} required /></label>
    {hasSchedule ? <div className="employee-leave-warning"><strong>이 날짜에 배정된 근무가 있습니다.</strong><p>신청은 가능하지만 승인 후에도 근무가 자동 삭제되지는 않습니다.</p></div> : null}
    <label className="employee-checkbox"><input type="checkbox" checked={draft.allDay} onChange={(event) => setDraft((current) => ({ ...current, allDay: event.target.checked, startTime: event.target.checked ? null : '09:00', endTime: event.target.checked ? null : '18:00' }))} /><span>하루 전체 근무 불가</span></label>
    {!draft.allDay ? <div className="employee-leave-time"><label>시작 시간<TimePicker value={draft.startTime ?? '09:00'} onChange={(startTime) => setDraft((current) => ({ ...current, startTime }))} /></label><span>~</span><label>종료 시간<TimePicker value={draft.endTime ?? '18:00'} onChange={(endTime) => setDraft((current) => ({ ...current, endTime }))} /></label></div> : null}
    <label>신청 사유<textarea value={draft.reason} maxLength={500} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="매니저가 확인할 수 있도록 사유를 입력해주세요." required /></label>
    {message ? <p className="employee-form-message" role="status">{message}</p> : null}
    <div className="employee-form-actions">{editingRequest ? <button type="button" onClick={onCancelEdit}>수정 취소</button> : null}<button className="primary" type="submit" disabled={isSaving || !draft.storeId}>{isSaving ? '저장 중...' : editingRequest ? '수정 저장' : '신청하기'}</button></div>
  </form></section>;
}

function createDraft(storeId = ''): LeaveDraft {
  return { storeId, targetDate: formatDate(new Date()), allDay: true, startTime: null, endTime: null, reason: '' };
}
