import { useEffect, useMemo, useState } from 'react';
import type { Shift, Store } from '../../domain/types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { fetchTeamShifts, type EmployeeDayNote } from '../../services/meApi';
import { addDays, dayLabel, formatDate, formatKoreanRange, getWeekDays, getWeekStart, shiftDuration, splitShiftTime } from '../../utils/schedule';
import { Dropdown } from '../common/Dropdown';
import { ListSkeleton } from '../common/Skeleton';

type Props = {
  employeeId: string;
  stores: Array<Pick<Store, 'id' | 'name' | 'color'>>;
};

export function EmployeeTeamSchedulePage({ employeeId, stores }: Props) {
  const today = formatDate(new Date());
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [storeId, setStoreId] = useState(() => stores[0]?.id ?? '');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dayNotes, setDayNotes] = useState<EmployeeDayNote[]>([]);
  const [openMemoDate, setOpenMemoDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRevision = useFocusRefresh();
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const employeeCount = new Set(shifts.map((shift) => shift.employeeId)).size;
  const myShifts = shifts.filter((shift) => shift.employeeId === employeeId);
  const myTotalMinutes = myShifts.reduce((total, shift) => total + shiftDuration(shift.time), 0);

  useEffect(() => {
    if (!stores.some((store) => store.id === storeId)) setStoreId(stores[0]?.id ?? '');
  }, [storeId, stores]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchTeamShifts(days[0], days[6], storeId)
      .then((next) => {
        if (!mounted) return;
        setShifts(next.shifts);
        setDayNotes(next.dayNotes);
      })
      .catch((requestError: Error) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [days, refreshRevision, storeId]);

  return (
    <section className="employee-page employee-team-page">
      <header className="employee-page-heading"><div><span>{myShifts.length ? '내 배정 근무를 포함한' : '직원 전체'}</span><h1>주간 근무표</h1></div><div className="employee-weekly-heading-actions"><label><span>근무지</span><Dropdown value={storeId} onChange={(nextStoreId) => { setStoreId(nextStoreId); setOpenMemoDate(''); }} options={stores.map((store) => ({ value: store.id, label: store.name }))} disabled={stores.length <= 1} ariaLabel="주간 근무표 근무지 선택" /></label><strong>{myShifts.length ? `주 ${Math.round(myTotalMinutes / 6) / 10}시간` : `${employeeCount}명`}</strong></div></header>
      <div className="employee-week-controls"><button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} aria-label="이전 주">‹</button><button type="button" onClick={() => setWeekStart(getWeekStart(today))} aria-label="이번 주로 이동">{formatKoreanRange(days)}</button><button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} aria-label="다음 주">›</button></div>
      {isLoading ? <ListSkeleton rows={6} /> : null}
      {error ? <div className="employee-state is-error"><strong>근무표를 불러오지 못했습니다.</strong><p>{error}</p></div> : null}
      {!isLoading && !error ? <div className="employee-team-list">{days.map((date) => {
        const dayShifts = shifts.filter((shift) => shift.date === date);
        const notesForDay = dayNotes.filter((note) => note.date === date);
        const dayEmployeeCount = new Set(dayShifts.map((shift) => shift.employeeId)).size;
        return <article className={date === today ? 'is-today' : ''} key={date}>
          <header><div><strong>{dayLabel(date)}</strong>{date === today ? <span>오늘</span> : null}</div><div className="employee-team-day-actions"><small>{dayShifts.length ? `${dayEmployeeCount}명 근무` : '근무 없음'}</small>{notesForDay.length ? <button type="button" className={openMemoDate === date ? 'is-open' : undefined} aria-expanded={openMemoDate === date} onClick={() => setOpenMemoDate((current) => current === date ? '' : date)}>메모 확인</button> : null}</div></header>
          <div>{dayShifts.length ? dayShifts.map((shift) => {
            const { startTime, endTime } = splitShiftTime(shift.time);
            return <div className={`employee-team-shift${shift.employeeId === employeeId ? ' is-mine' : ''}`} key={shift.id}>
              <span style={{ borderColor: shift.templateColor?.startsWith('#') ? shift.templateColor : undefined }}><strong>{shift.employeeName}</strong>{shift.employeeId === employeeId ? <em>나</em> : null}</span>
              <span>{shift.storeName}<small>{startTime}-{endTime}{endTime <= startTime ? ' (익일)' : ''}</small></span>
            </div>;
          }) : <p className="employee-day-empty">배정된 근무가 없습니다.</p>}</div>
          {openMemoDate === date && notesForDay.length ? <aside className="employee-team-note"><strong>관리자 메모</strong>{notesForDay.map((note) => <p key={note.id}><b>{note.storeName}</b>{note.text}</p>)}</aside> : null}
        </article>;
      })}</div> : null}
    </section>
  );
}
