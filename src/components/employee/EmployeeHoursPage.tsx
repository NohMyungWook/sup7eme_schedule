import { useEffect, useState } from 'react';
import { fetchMonthlyHours, type MonthlyHours } from '../../services/meApi';
import { formatDate } from '../../utils/schedule';
import { ListSkeleton } from '../common/Skeleton';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

export function EmployeeHoursPage() {
  const [month, setMonth] = useState(() => formatDate(new Date()).slice(0, 7));
  const [summary, setSummary] = useState<MonthlyHours | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRevision = useFocusRefresh();
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchMonthlyHours(month).then((next) => { if (mounted) setSummary(next); }).catch((requestError: Error) => { if (mounted) setError(requestError.message); }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [month, refreshRevision]);
  function moveMonth(amount: number) { const [year, value] = month.split('-').map(Number); const next = new Date(year, value - 1 + amount, 1); setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`); }
  return <section className="employee-page employee-hours-page"><header className="employee-page-heading"><div><span>배정 근무시간</span><h1>월간 근무시간</h1></div></header><div className="employee-month-controls"><button type="button" onClick={() => moveMonth(-1)}>‹</button><strong>{month.replace('-', '년 ')}월</strong><button type="button" onClick={() => moveMonth(1)}>›</button></div>{isLoading ? <ListSkeleton rows={4} /> : null}{error ? <div className="employee-state is-error"><strong>근무시간을 불러오지 못했습니다.</strong><p>{error}</p></div> : null}{summary && !isLoading ? <><div className="employee-hours-summary"><article><span>총 배정 근무시간</span><strong>{(summary.totalMinutes / 60).toFixed(1)}시간</strong></article><article><span>근무 일수</span><strong>{summary.workDays}일</strong></article></div><section className="employee-hours-breakdown"><h2>근무지별</h2>{summary.byStore.map((item) => <div key={item.storeId}><span>{item.storeName}</span><strong>{(item.minutes / 60).toFixed(1)}시간</strong></div>)}{!summary.byStore.length ? <p>이 달에 배정된 근무가 없습니다.</p> : null}</section><section className="employee-hours-breakdown"><h2>주차별</h2>{summary.byWeek.map((item) => <div key={item.week}><span>{item.week}주차</span><strong>{(item.minutes / 60).toFixed(1)}시간</strong></div>)}{!summary.byWeek.length ? <p>표시할 주차별 근무가 없습니다.</p> : null}</section><section className="employee-hours-days"><h2>날짜별 근무</h2>{summary.days.map((day) => <div key={day.id}><span>{day.date}<small>{day.storeName}</small></span><strong>{day.startTime}-{day.endTime}<small>{(day.minutes / 60).toFixed(1)}시간</small></strong></div>)}{!summary.days.length ? <p>표시할 날짜별 근무가 없습니다.</p> : null}</section></> : null}</section>;
}
