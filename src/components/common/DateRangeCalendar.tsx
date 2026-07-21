import { useEffect, useMemo, useState } from 'react';
import { formatDate, getMonthDays, toDate } from '../../utils/schedule';

type Props = {
  startDate: string;
  endDate: string;
  minDate?: string;
  onChange: (startDate: string, endDate: string) => void;
};

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function DateRangeCalendar({ startDate, endDate, minDate, onChange }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(startDate.slice(0, 7));
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const today = formatDate(new Date());
  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const leadingDays = monthDays.length ? toDate(monthDays[0]).getDay() : 0;
  const [year, month] = visibleMonth.split('-').map(Number);

  useEffect(() => {
    if (!selectionStart && startDate) setVisibleMonth(startDate.slice(0, 7));
  }, [selectionStart, startDate]);

  function moveMonth(amount: number) {
    const next = new Date(year, month - 1 + amount, 1);
    setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  function selectDate(date: string) {
    if (minDate && date < minDate) return;
    if (!selectionStart) {
      setSelectionStart(date);
      onChange(date, date);
      return;
    }
    onChange(
      selectionStart <= date ? selectionStart : date,
      selectionStart <= date ? date : selectionStart,
    );
    setSelectionStart(null);
  }

  return (
    <div className="date-range-calendar">
      <header>
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button>
        <strong>{year}년 {month}월</strong>
        <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">›</button>
      </header>
      <div className="date-range-calendar-weekdays" aria-hidden="true">
        {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="date-range-calendar-days" role="grid" aria-label={`${year}년 ${month}월 날짜 선택`}>
        {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} />)}
        {monthDays.map((date) => {
          const disabled = Boolean(minDate && date < minDate);
          const isStart = date === startDate;
          const isEnd = date === endDate;
          const isInRange = startDate < date && date < endDate;
          return <button
            type="button"
            key={date}
            disabled={disabled}
            className={[isStart ? 'is-start' : '', isEnd ? 'is-end' : '', isInRange ? 'is-in-range' : '', date === today ? 'is-today' : ''].filter(Boolean).join(' ')}
            onClick={() => selectDate(date)}
            aria-label={new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' }).format(toDate(date))}
            aria-selected={isStart || isEnd || isInRange}
          >{Number(date.slice(-2))}</button>;
        })}
      </div>
      <p>{selectionStart ? '종료 날짜를 선택해주세요.' : startDate === endDate ? `${startDate} 하루` : `${startDate} ~ ${endDate}`}</p>
    </div>
  );
}
