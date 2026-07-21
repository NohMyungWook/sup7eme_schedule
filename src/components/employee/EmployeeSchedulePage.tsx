import { useEffect, useMemo, useState } from 'react';
import type { Shift } from '../../domain/types';
import { fetchMyShifts } from '../../services/meApi';
import { addDays, dayLabel, formatDate, formatKoreanRange, getWeekDays, getWeekStart, shiftDuration, splitShiftTime } from '../../utils/schedule';
import { ListSkeleton } from '../common/Skeleton';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

export function EmployeeSchedulePage() {
  const today = formatDate(new Date());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRevision = useFocusRefresh();
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const totalMinutes = shifts.reduce((sum, shift) => sum + shiftDuration(shift.time), 0);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchMyShifts(days[0], days[6])
      .then((next) => { if (mounted) setShifts(next); })
      .catch((requestError: Error) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [days, refreshRevision]);

  return (
    <section className="employee-page employee-schedule-page">
      <header className="employee-page-heading"><div><span>배정 근무</span><h1>내 스케줄</h1></div><strong>주 {Math.round(totalMinutes / 6) / 10}시간</strong></header>
      <div className="employee-week-controls"><button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} aria-label="이전 주">‹</button><button type="button" onClick={() => setWeekStart(getWeekStart(today))} aria-label="이번 주로 이동">{formatKoreanRange(days)}</button><button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} aria-label="다음 주">›</button></div>
      {isLoading ? <ListSkeleton rows={5} /> : null}
      {error ? <div className="employee-state is-error"><strong>스케줄을 불러오지 못했습니다.</strong><p>{error}</p></div> : null}
      {!isLoading && !error ? <div className="employee-schedule-list">{days.map((date) => {
        const dayShifts = shifts.filter((shift) => shift.date === date);
        const isToday = date === today;
        return <article className={isToday ? 'is-today' : ''} key={date}><header><div><strong>{dayLabel(date)}</strong>{isToday ? <span>오늘</span> : null}</div><small>{dayShifts.length ? `${dayShifts.length}건` : '근무 없음'}</small></header>{dayShifts.length ? dayShifts.map((shift) => {
          const { startTime, endTime } = splitShiftTime(shift.time);
          const isNight = endTime <= startTime;
          return <div className="employee-shift-card" key={shift.id} style={{ borderColor: shift.templateColor?.startsWith('#') ? shift.templateColor : undefined }}><div><span>{shift.storeName || '근무지'}</span><strong>{shift.time}{isNight ? <small> 익일</small> : null}</strong><p>{shift.templateLabel || '근무'}{shift.note ? ` · ${shift.note}` : ''}</p></div></div>;
        }) : <p className="employee-day-empty">배정된 근무가 없습니다.</p>}{dayShifts.some((shift) => shift.dayNote) ? <aside><strong>특이사항</strong>{[...new Set(dayShifts.map((shift) => shift.dayNote).filter(Boolean))].map((note) => <p key={note}>{note}</p>)}</aside> : null}</article>;
      })}</div> : null}
    </section>
  );
}
