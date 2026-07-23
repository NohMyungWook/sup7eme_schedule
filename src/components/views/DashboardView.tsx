import { useEffect, useMemo, useState } from 'react';
import { weekdays } from '../../domain/data';
import { getStoreName, getStoreShifts } from '../../domain/selectors';
import type { Employee, Shift, Store } from '../../domain/types';
import { fetchDashboard, type DashboardData } from '../../services/dashboardApi';
import { fullDateLabel, getMonthDays, toDate } from '../../utils/schedule';
import { ListSkeleton } from '../common/Skeleton';
import { Dropdown } from '../common/Dropdown';
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

export function DashboardView({ storeId, stores, month, employees, shifts, onStoreChange, onMonthChange, onDateSelect }: DashboardViewProps) {
  const days = useMemo(() => getMonthDays(month), [month]);
  const monthOptions = useMemo(() => getMonthOptions(month), [month]);
  const storeShifts = getStoreShifts(shifts, storeId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let mounted = true;
    setIsLoading(true);
    setError('');
    fetchDashboard(storeId, month)
      .then((next) => { if (mounted) setData(next); })
      .catch((requestError: Error) => { if (mounted) setError(requestError.message); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [month, shifts, storeId]);

  const gapsByDate = new Map<string, DashboardData['gaps']>();
  data?.gaps.forEach((gap) => gapsByDate.set(gap.date, [...(gapsByDate.get(gap.date) ?? []), gap]));
  const coverageByDate = new Map(data?.coverageByDate.map((coverage) => [coverage.date, coverage]));

  return <>
    <header className="dashboard-header"><div><h1>월간 대시보드</h1><p>배정 근무시간과 설정된 필요 인원 규칙을 월 단위로 확인합니다.</p></div><div className="dashboard-controls"><label>매장<StoreSelect stores={stores} value={storeId} onChange={onStoreChange} /></label><label>조회 월<Dropdown value={month} onChange={onMonthChange} options={monthOptions} ariaLabel="대시보드 조회 월 선택" /></label></div></header>
    {error ? <div className="dashboard-api-error" role="alert">{error}</div> : null}
    <section className="dashboard-summary" aria-label="월간 운영 요약"><article><span>등록 근무</span><strong>{isLoading ? '—' : `${data?.registeredShifts ?? 0}건`}</strong></article><article><span>총 배정 근무시간</span><strong>{isLoading ? '—' : `${((data?.totalMinutes ?? 0) / 60).toFixed(1)}시간`}</strong></article><article className={data?.gaps.length ? 'has-warning' : ''}><span>인원 부족 구간</span><strong>{isLoading ? '—' : data?.hasCoverageRules ? `${data.gaps.length}건` : '규칙 없음'}</strong></article><article><span>근무 참여 직원</span><strong>{isLoading ? '—' : `${data?.participatingEmployees ?? 0}명`}</strong></article></section>
    <div className="dashboard-main-grid"><section className="dashboard-panel employee-hours-panel"><div className="dashboard-panel-title"><div><h2>직원별 이번 달 배정 근무시간</h2><p>{getStoreName(storeId, stores)} 배치 기준</p></div></div><div className="employee-hours-list">{isLoading ? <ListSkeleton rows={4} /> : data?.employeeHours.map((item) => { const employee = employees.find((row) => row.id === item.employeeId); const maxMinutes = data.employeeHours[0]?.minutes || 1; return <div className="employee-hours-item" key={item.employeeId}><span style={{ background: employee?.color ?? '#ece9f8' }}>{item.employeeName.slice(0, 1)}</span><div><strong>{item.employeeName}</strong><div><i style={{ width: `${Math.max(4, item.minutes / maxMinutes * 100)}%` }} /></div></div><b>{(item.minutes / 60).toFixed(1)}시간</b></div>; })}{!isLoading && !data?.employeeHours.length ? <p className="dashboard-empty">이 달에 등록된 직원 근무가 없습니다.</p> : null}</div></section><section className="dashboard-panel gap-alert-panel"><div className="dashboard-panel-title"><div><h2>채워야 할 시간</h2><p>스케줄 규칙의 최소 필요 인원 기준</p></div></div><div className="gap-alert-list">{data?.gaps.map((gap, index) => <button type="button" key={`${gap.date}-${gap.startTime}-${index}`} onClick={() => onDateSelect(gap.date)}><span>{fullDateLabel(gap.date)}</span><strong>{gap.startTime}-{gap.endTime} · {gap.assigned}/{gap.required}명</strong></button>)}{!isLoading && data && !data.hasCoverageRules ? <p className="dashboard-empty">등록된 필요 인원 규칙이 없어 빈 시간을 임의로 계산하지 않습니다.</p> : null}{!isLoading && data?.hasCoverageRules && !data.gaps.length ? <p className="dashboard-empty">설정된 필요 인원 규칙을 모두 충족했습니다.</p> : null}</div></section></div>
    <section className="dashboard-panel store-hours-panel"><div className="dashboard-panel-title"><div><h2>매장별 이번 달 배정 근무시간</h2><p>현재 계정이 조회할 수 있는 담당 매장 기준</p></div></div><div className="store-hours-list">{isLoading ? <ListSkeleton rows={3} /> : (data?.storeHours ?? []).map((item) => <div key={item.storeId}><span>{item.storeName}</span><strong>{(item.minutes / 60).toFixed(1)}시간</strong></div>)}{!isLoading && !data?.storeHours?.length ? <p className="dashboard-empty">이 달에 배정된 매장 근무가 없습니다.</p> : null}</div></section>
    <section className="dashboard-panel calendar-panel"><div className="dashboard-panel-title"><div><h2>{month.replace('-', '년 ')}월 운영 현황</h2><p>날짜별 00:00~24:00 배치 공백을 확인합니다.</p></div></div><div className="month-calendar">{weekdays.map((weekday) => <strong className="month-weekday" key={weekday}>{weekday}</strong>)}{Array.from({ length: toDate(days[0]).getDay() }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{days.map((date) => { const coverage = coverageByDate.get(date); const dayShifts = storeShifts.filter((shift) => shift.date === date); const dayEmployeeCount = new Set(dayShifts.map((shift) => shift.employeeId)).size; const gapLabel = coverage?.uncoveredRanges.length === 1 ? `빈 시간 ${coverage.uncoveredRanges[0].startTime}-${coverage.uncoveredRanges[0].endTime}` : `빈 시간 ${coverage?.uncoveredRanges.length ?? 0}구간`; return <button className={`calendar-day ${coverage?.isComplete ? 'is-covered' : 'has-gap'}`} type="button" key={date} onClick={() => onDateSelect(date)}><span>{toDate(date).getDate()}</span><small>{dayEmployeeCount}명 · {dayShifts.length}건</small><em>{isLoading ? '운영 현황 확인 중' : coverage?.isComplete ? '등록 완료' : gapLabel}</em></button>; })}</div></section>
  </>;
}

function getMonthOptions(selectedMonth: string) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const base = new Date(year, month - 1, 1);
  return Array.from({ length: 241 }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() + index - 120, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: `${date.getFullYear()}년 ${date.getMonth() + 1}월` };
  });
}
