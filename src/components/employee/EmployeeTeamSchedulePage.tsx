import { useEffect, useMemo, useState } from 'react';
import type { Shift } from '../../domain/types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { fetchTeamShifts } from '../../services/meApi';
import { addDays, dayLabel, formatDate, formatKoreanRange, getWeekDays, getWeekStart, splitShiftTime } from '../../utils/schedule';
import { ListSkeleton } from '../common/Skeleton';

export function EmployeeTeamSchedulePage({ employeeId }: { employeeId: string }) {
  const today = formatDate(new Date());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRevision = useFocusRefresh();
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const employeeCount = new Set(shifts.map((shift) => shift.employeeId)).size;

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchTeamShifts(days[0], days[6])
      .then((next) => { if (mounted) setShifts(next); })
      .catch((requestError: Error) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [days, refreshRevision]);

  return (
    <section className="employee-page employee-team-page">
      <header className="employee-page-heading"><div><span>함께 근무하는 직원</span><h1>주간 근무표</h1></div><strong>{employeeCount}명</strong></header>
      <div className="employee-week-controls"><button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} aria-label="이전 주">‹</button><button type="button" onClick={() => setWeekStart(getWeekStart(today))} aria-label="이번 주로 이동">{formatKoreanRange(days)}</button><button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} aria-label="다음 주">›</button></div>
      {isLoading ? <ListSkeleton rows={6} /> : null}
      {error ? <div className="employee-state is-error"><strong>근무표를 불러오지 못했습니다.</strong><p>{error}</p></div> : null}
      {!isLoading && !error ? <div className="employee-team-list">{days.map((date) => {
        const dayShifts = shifts.filter((shift) => shift.date === date);
        const dayEmployeeCount = new Set(dayShifts.map((shift) => shift.employeeId)).size;
        return <article className={date === today ? 'is-today' : ''} key={date}>
          <header><div><strong>{dayLabel(date)}</strong>{date === today ? <span>오늘</span> : null}</div><small>{dayShifts.length ? `${dayEmployeeCount}명 근무` : '근무 없음'}</small></header>
          <div>{dayShifts.length ? dayShifts.map((shift) => {
            const { startTime, endTime } = splitShiftTime(shift.time);
            return <div className={`employee-team-shift${shift.employeeId === employeeId ? ' is-mine' : ''}`} key={shift.id}>
              <span style={{ borderColor: shift.templateColor?.startsWith('#') ? shift.templateColor : undefined }}><strong>{shift.employeeName}</strong>{shift.employeeId === employeeId ? <em>나</em> : null}</span>
              <span>{shift.storeName}<small>{startTime}-{endTime}{endTime <= startTime ? ' (익일)' : ''}</small></span>
            </div>;
          }) : <p className="employee-day-empty">배정된 근무가 없습니다.</p>}</div>
        </article>;
      })}</div> : null}
    </section>
  );
}
