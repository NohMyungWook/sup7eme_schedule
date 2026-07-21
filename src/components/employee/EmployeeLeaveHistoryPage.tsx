import { useEffect, useMemo, useState } from 'react';
import type { LeaveRequest, LeaveRequestStatus } from '../../domain/types';
import { fetchLeaveRequests, transitionLeaveRequest } from '../../services/leaveApi';
import { fullDateRangeLabel } from '../../utils/schedule';
import { Dropdown } from '../common/Dropdown';
import { ListSkeleton } from '../common/Skeleton';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

const statusLabels: Record<LeaveRequestStatus, string> = { pending: '승인 대기', approved: '승인', rejected: '반려', cancelled: '취소' };

export function EmployeeLeaveHistoryPage({ refreshKey, onEdit }: { refreshKey: number; onEdit: (request: LeaveRequest) => void }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [status, setStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const focusRevision = useFocusRefresh();
  const filtered = useMemo(() => requests.filter((request) => status === 'all' || request.status === status), [requests, status]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchLeaveRequests()
      .then((next) => { if (mounted) setRequests(next); })
      .catch((error: Error) => { if (mounted) setMessage(error.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [focusRevision, refreshKey]);

  async function cancel(request: LeaveRequest) {
    if (!window.confirm('이 휴무 신청을 취소할까요?')) return;
    try {
      const result = await transitionLeaveRequest(request.id, 'cancel');
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, ...result.request } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '신청을 취소하지 못했습니다.');
    }
  }

  return <section className="employee-page employee-history-page"><header className="employee-page-heading"><div><span>휴무 · 근무 불가</span><h1>신청 내역</h1></div><Dropdown value={status} onChange={setStatus} options={[{ value: 'all', label: '전체 상태' }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} ariaLabel="신청 상태" /></header>{isLoading ? <ListSkeleton rows={5} /> : null}{message ? <p className="employee-form-message is-error">{message}</p> : null}<div className="employee-history-list">{!isLoading && !filtered.length ? <div className="employee-state"><strong>신청 내역이 없습니다.</strong><p>휴무가 필요할 때 새 신청을 등록해보세요.</p></div> : filtered.map((request) => <article key={request.id}><header><div><strong>{fullDateRangeLabel(request.targetDate, request.endDate)}</strong><span>{request.storeName}</span></div><i className={`leave-status ${request.status}`}>{statusLabels[request.status]}</i></header><p>선택 날짜 전체 · {request.reason}</p>{request.hasScheduleConflict ? <em>배정 근무 있음</em> : null}{request.decisionReason ? <aside><strong>처리 사유</strong><p>{request.decisionReason}</p></aside> : null}{request.status === 'pending' ? <div><button type="button" onClick={() => onEdit(request)}>수정</button><button type="button" onClick={() => cancel(request)}>신청 취소</button></div> : null}</article>)}</div></section>;
}
