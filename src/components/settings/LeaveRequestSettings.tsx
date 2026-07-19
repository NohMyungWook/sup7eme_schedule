import { useEffect, useMemo, useState } from 'react';
import type { Employee, LeaveRequest, LeaveRequestStatus, Store } from '../../domain/types';
import { fetchLeaveRequests, transitionLeaveRequest } from '../../services/leaveApi';
import { fullDateLabel } from '../../utils/schedule';
import { Dropdown } from '../common/Dropdown';
import { ListSkeleton } from '../common/Skeleton';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

const statusLabels: Record<LeaveRequestStatus, string> = {
  pending: '승인 대기', approved: '승인', rejected: '반려', cancelled: '취소',
};

type Props = {
  stores: Store[];
  employees: Employee[];
  canUpdate: boolean;
  onBack: () => void;
  onOpenSchedule: (date: string, storeId: string) => void;
};

export function LeaveRequestSettings({ stores, employees, canUpdate, onBack, onOpenSchedule }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const refreshRevision = useFocusRefresh();
  const selected = requests.find((request) => request.id === selectedId) ?? requests[0] ?? null;
  const filtered = useMemo(() => requests.filter((request) =>
    (storeFilter === 'all' || request.storeId === storeFilter)
    && (statusFilter === 'all' || request.status === statusFilter)
    && (employeeFilter === 'all' || request.employeeId === employeeFilter)
    && (!startDate || request.targetDate >= startDate)
    && (!endDate || request.targetDate <= endDate)), [employeeFilter, endDate, requests, startDate, statusFilter, storeFilter]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchLeaveRequests()
      .then((next) => {
        if (!mounted) return;
        setRequests(next);
        setSelectedId(next[0]?.id ?? '');
      })
      .catch((error: Error) => { if (mounted) setMessage(error.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [refreshRevision]);

  async function transition(action: 'approve' | 'reject') {
    if (!selected || !canUpdate || isSaving) return;
    if (action === 'reject' && !decisionReason.trim()) {
      setMessage('반려 사유를 입력해주세요.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      const result = await transitionLeaveRequest(selected.id, action, decisionReason.trim());
      setRequests((current) => current.map((request) => request.id === selected.id ? { ...request, ...result.request } : request));
      setDecisionReason('');
      setMessage(action === 'approve' ? '휴무 신청을 승인했습니다.' : '휴무 신청을 반려했습니다.');
      window.dispatchEvent(new CustomEvent('sup7eme:data-changed', { detail: { resources: ['leaveRequests', 'schedule'] } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '신청을 처리하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <header className="settings-detail-header">
        <button className="settings-back-button" type="button" onClick={onBack}>← 설정으로 돌아가기</button>
        <div><h1>휴무 신청 내역 관리</h1><p>직원 신청과 스케줄 충돌을 확인하고 승인 또는 반려합니다.</p></div>
      </header>
      <div className="leave-admin-layout">
        <section className="leave-admin-list">
          <div className="leave-admin-filters">
            <Dropdown value={storeFilter} onChange={setStoreFilter} ariaLabel="근무지 필터" options={[{ value: 'all', label: '전체 근무지' }, ...stores.map((store) => ({ value: store.id, label: store.name }))]} />
            <Dropdown value={statusFilter} onChange={setStatusFilter} ariaLabel="상태 필터" options={[{ value: 'all', label: '전체 상태' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} />
            <Dropdown value={employeeFilter} onChange={setEmployeeFilter} ariaLabel="직원 필터" options={[{ value: 'all', label: '전체 직원' }, ...employees.map((employee) => ({ value: employee.id, label: employee.name }))]} />
            <label>시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>종료일<input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
          </div>
          <div className="leave-request-list">
            {isLoading ? <ListSkeleton rows={6} /> : null}
            {!isLoading && !filtered.length ? <div className="leave-empty"><strong>조건에 맞는 신청이 없습니다.</strong><p>필터를 변경하거나 새 신청이 들어오면 이곳에 표시됩니다.</p></div> : null}
            {!isLoading && filtered.map((request) => <button type="button" className={request.id === selected?.id ? 'is-selected' : ''} key={request.id} onClick={() => { setSelectedId(request.id); setDecisionReason(''); setMessage(''); }}><span><strong>{request.employeeName}</strong><small>{request.storeName}</small></span><span><b>{fullDateLabel(request.targetDate)}</b><small>{request.allDay ? '하루 전체' : `${request.startTime}-${request.endTime}`}</small></span>{request.hasScheduleConflict ? <em>스케줄 충돌</em> : null}<i className={`leave-status ${request.status}`}>{statusLabels[request.status]}</i></button>)}
          </div>
        </section>
        <aside className="leave-admin-detail">
          {!selected ? <div className="leave-empty"><strong>신청을 선택해주세요.</strong></div> : <>
            <header><div><span className={`leave-status ${selected.status}`}>{statusLabels[selected.status]}</span><h2>{selected.employeeName} · {fullDateLabel(selected.targetDate)}</h2><p>{selected.storeName} · {selected.allDay ? '하루 전체' : `${selected.startTime}-${selected.endTime}`}</p></div></header>
            <section><h3>신청 사유</h3><p>{selected.reason}</p></section>
            {selected.hasScheduleConflict ? <section className="leave-conflict"><strong>배정된 근무가 있습니다.</strong><p>신청 승인 후에도 스케줄은 자동 삭제되지 않습니다. 스케줄을 직접 확인하고 조정해주세요.</p><button type="button" onClick={() => onOpenSchedule(selected.targetDate, selected.storeId)}>해당 날짜 스케줄 보기</button></section> : null}
            {selected.status === 'pending' ? <section className="leave-decision"><label>처리 사유<textarea value={decisionReason} maxLength={500} onChange={(event) => setDecisionReason(event.target.value)} placeholder="승인 메모 또는 반려 사유를 입력하세요." /></label><div><button type="button" onClick={() => transition('reject')} disabled={!canUpdate || isSaving}>반려</button><button className="primary" type="button" onClick={() => transition('approve')} disabled={!canUpdate || isSaving}>{isSaving ? '처리 중...' : '승인'}</button></div></section> : <section><h3>처리 결과</h3><p>{selected.decisionReason || '별도 처리 사유가 없습니다.'}</p><small>{selected.processedByName ? `${selected.processedByName} · ` : ''}{selected.processedAt ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.processedAt)) : ''}</small></section>}
          </>}
          {message ? <p className="leave-admin-message" role="status">{message}</p> : null}
        </aside>
      </div>
    </>
  );
}
