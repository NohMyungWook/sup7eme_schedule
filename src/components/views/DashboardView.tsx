import { useMemo } from 'react';
import { weekdays } from '../../domain/data';
import { getStoreEmployees, getStoreName, getStoreShifts } from '../../domain/selectors';
import type { Employee, Shift, Store } from '../../domain/types';
import {
  coverageGaps,
  fullDateLabel,
  getMonthDays,
  minutesToTime,
  shiftDuration,
  toDate,
} from '../../utils/schedule';
import { StoreSelect } from '../common/StoreSelect';

type DashboardViewProps = {
  storeId: string;
  stores: Store[];
  month: string;
  employees: Employee[];
  shifts: Shift[];
  onStoreChange: (storeId: string) => void;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
};

export function DashboardView({
  storeId,
  stores,
  month,
  employees,
  shifts,
  onStoreChange,
  onMonthChange,
  onDateSelect,
}: DashboardViewProps) {
  const days = useMemo(() => getMonthDays(month), [month]);
  const storeEmployees = getStoreEmployees(employees, storeId);
  const storeShifts = getStoreShifts(shifts, storeId);
  const employeeHours = storeEmployees
    .map((employee) => ({
      employee,
      minutes: storeShifts
        .filter((shift) => shift.employeeId === employee.id && shift.date.startsWith(month))
        .reduce((total, shift) => total + shiftDuration(shift.time), 0),
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const coverage = days.map((date) => ({
    date,
    shifts: storeShifts.filter((shift) => shift.date === date),
    gaps: coverageGaps(date, storeShifts),
  }));
  const gapDays = coverage.filter((day) => day.gaps.length > 0);
  const totalMinutes = employeeHours.reduce((total, item) => total + item.minutes, 0);

  return (
    <>
      <header className="dashboard-header">
        <div><h1>월간 대시보드</h1><p>근무시간과 비어 있는 운영 시간대를 월 단위로 확인합니다.</p></div>
        <div className="dashboard-controls">
          <label>매장<StoreSelect stores={stores} value={storeId} onChange={onStoreChange} /></label>
          <label>조회 월<input type="month" value={month} onChange={(event) => onMonthChange(event.target.value)} /></label>
        </div>
      </header>
      <section className="dashboard-summary" aria-label="월간 운영 요약">
        <article><span>등록 근무</span><strong>{storeShifts.filter((shift) => shift.date.startsWith(month)).length}건</strong></article>
        <article><span>총 근무시간</span><strong>{(totalMinutes / 60).toFixed(1)}시간</strong></article>
        <article className={gapDays.length ? 'has-warning' : ''}><span>빈 시간 있는 날</span><strong>{gapDays.length}일</strong></article>
        <article><span>근무 참여 직원</span><strong>{employeeHours.length}명</strong></article>
      </section>
      <div className="dashboard-main-grid">
        <section className="dashboard-panel employee-hours-panel">
          <div className="dashboard-panel-title"><div><h2>직원별 이번 달 근무시간</h2><p>{getStoreName(storeId, stores)} 배치 기준</p></div></div>
          <div className="employee-hours-list">
            {employeeHours.map(({ employee, minutes }) => {
              const maxMinutes = employeeHours[0]?.minutes || 1;
              return <div className="employee-hours-item" key={employee.id}><span style={{ background: employee.color }}>{employee.name.slice(0, 1)}</span><div><strong>{employee.name}</strong><div><i style={{ width: `${Math.max(4, (minutes / maxMinutes) * 100)}%` }} /></div></div><b>{(minutes / 60).toFixed(1)}시간</b></div>;
            })}
            {!employeeHours.length ? <p className="dashboard-empty">이 달에 등록된 직원 근무가 없습니다.</p> : null}
          </div>
        </section>
        <section className="dashboard-panel gap-alert-panel">
          <div className="dashboard-panel-title"><div><h2>채워야 할 시간</h2><p>24시간 운영 기준 미배치 구간</p></div></div>
          <div className="gap-alert-list">
            {gapDays.map((day) => <button type="button" key={day.date} onClick={() => onDateSelect(day.date)}><span>{fullDateLabel(day.date)}</span><strong>{day.gaps.map(([start, end]) => `${minutesToTime(start)}-${minutesToTime(end)}`).join(', ')}</strong></button>)}
            {!gapDays.length ? <p className="dashboard-empty">모든 날짜의 운영 시간이 채워져 있습니다.</p> : null}
          </div>
        </section>
      </div>
      <section className="dashboard-panel calendar-panel">
        <div className="dashboard-panel-title"><div><h2>{month.replace('-', '년 ')}월 운영 현황</h2><p>날짜를 누르면 해당 주 스케줄로 이동합니다.</p></div></div>
        <div className="month-calendar">
          {weekdays.map((weekday) => <strong className="month-weekday" key={weekday}>{weekday}</strong>)}
          {Array.from({ length: toDate(days[0]).getDay() }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
          {coverage.map((day) => (
            <button className={`calendar-day ${day.gaps.length ? 'has-gap' : 'is-covered'}`} type="button" key={day.date} onClick={() => onDateSelect(day.date)}>
              <span>{toDate(day.date).getDate()}</span><small>{day.shifts.length}명 배치</small>
              {day.gaps.length ? <em>{day.gaps.length === 1 ? `${minutesToTime(day.gaps[0][0])}-${minutesToTime(day.gaps[0][1])}` : `빈 시간 ${day.gaps.length}구간`}</em> : <em>24시간 완료</em>}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
