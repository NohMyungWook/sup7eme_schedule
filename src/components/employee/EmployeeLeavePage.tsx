import { useEffect, useState, type FormEvent } from 'react';
import type { LeaveRequest, Store } from '../../domain/types';
import { saveLeaveRequest, type LeaveDraft } from '../../services/leaveApi';
import { fetchMyShifts } from '../../services/meApi';
import { formatDate } from '../../utils/schedule';
import { DateRangeCalendar } from '../common/DateRangeCalendar';
import { Dropdown } from '../common/Dropdown';

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
      endDate: editingRequest.endDate,
      reason: editingRequest.reason,
      updatedAt: editingRequest.updatedAt,
    } : createDraft(stores[0]?.id));
  }, [editingRequest, stores]);

  useEffect(() => {
    let mounted = true;
    fetchMyShifts(draft.targetDate, draft.endDate)
      .then((shifts) => { if (mounted) setHasSchedule(shifts.length > 0); })
      .catch(() => { if (mounted) setHasSchedule(false); });
    return () => { mounted = false; };
  }, [draft.endDate, draft.targetDate]);

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
    <div className="employee-form-field"><strong>휴무 날짜</strong><span className="employee-field-help">첫 날짜를 누른 뒤 종료 날짜를 누르면 여러 날을 선택할 수 있습니다.</span><DateRangeCalendar startDate={draft.targetDate} endDate={draft.endDate} minDate={formatDate(new Date())} onChange={(targetDate, endDate) => setDraft((current) => ({ ...current, targetDate, endDate }))} /></div>
    {hasSchedule ? <div className="employee-leave-warning"><strong>선택한 기간에 배정된 근무가 있습니다.</strong><p>신청은 가능하지만 승인 후에도 근무가 자동 삭제되지는 않습니다.</p></div> : null}
    <label>신청 사유<textarea value={draft.reason} maxLength={500} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="매니저가 확인할 수 있도록 사유를 입력해주세요." required /></label>
    {message ? <p className="employee-form-message" role="status">{message}</p> : null}
    <div className="employee-form-actions">{editingRequest ? <button type="button" onClick={onCancelEdit}>수정 취소</button> : null}<button className="primary" type="submit" disabled={isSaving || !draft.storeId}>{isSaving ? '저장 중...' : editingRequest ? '수정 저장' : '신청하기'}</button></div>
  </form></section>;
}

function createDraft(storeId = ''): LeaveDraft {
  const today = formatDate(new Date());
  return { storeId, targetDate: today, endDate: today, reason: '' };
}
