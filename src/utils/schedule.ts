import type { Employee, Shift, ShiftTemplate } from '../domain/types';

export function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, amount: number) {
  const date = toDate(value);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

export function getWeekDays(start: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getWeekStart(date: string) {
  return addDays(date, -toDate(date).getDay());
}

export function getMonthDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return Array.from(
    { length: lastDay },
    (_, index) =>
      `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
  );
}

export function parseTimeToMinutes(value?: string, allow24 = false) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (
    minutes < 0 ||
    minutes > 59 ||
    hours < 0 ||
    hours > 24 ||
    (hours === 24 && (!allow24 || minutes !== 0))
  ) return null;
  return hours * 60 + minutes;
}

export function splitShiftTime(time: string) {
  const [rawStartTime, rawEndTime] = time.split('-');
  const startTime =
    parseTimeToMinutes(rawStartTime) === null ? '08:00' : rawStartTime;
  const validEndTime =
    parseTimeToMinutes(rawEndTime, true) === null ? '15:00' : rawEndTime;
  return {
    startTime,
    endTime: validEndTime === '24:00' ? '00:00' : validEndTime,
  };
}

export function minutesToTime(value: number) {
  if (value === 1440) return '24:00';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function shiftDuration(time: string) {
  const [startValue, endValue] = time.split('-');
  if (!startValue || !endValue) return 0;
  const start = parseTimeToMinutes(startValue);
  let end = parseTimeToMinutes(endValue, true);
  if (start === null || end === null || start === end) return 0;
  if (end <= start) end += 1440;
  return end - start;
}

export function coverageGaps(date: string, storeShifts: Shift[]) {
  const intervals = storeShifts.flatMap((shift) => {
    const dayOffset =
      shift.date === date ? 0 : shift.date === addDays(date, -1) ? -1440 : null;
    if (dayOffset === null) return [];
    const [startValue, endValue] = shift.time.split('-');
    if (!startValue || !endValue) return [];
    const parsedStart = parseTimeToMinutes(startValue);
    const parsedEnd = parseTimeToMinutes(endValue, true);
    if (parsedStart === null || parsedEnd === null || parsedStart === parsedEnd) {
      return [];
    }
    const start = parsedStart + dayOffset;
    let end = parsedEnd + dayOffset;
    if (end <= start) end += 1440;
    const clippedStart = Math.max(0, start);
    const clippedEnd = Math.min(1440, end);
    return clippedEnd > clippedStart ? [[clippedStart, clippedEnd]] : [];
  });

  const merged = intervals
    .sort((a, b) => a[0] - b[0])
    .reduce<number[][]>((result, interval) => {
      const last = result[result.length - 1];
      if (!last || interval[0] > last[1]) result.push([...interval]);
      else last[1] = Math.max(last[1], interval[1]);
      return result;
    }, []);

  const gaps: number[][] = [];
  let cursor = 0;
  merged.forEach(([start, end]) => {
    if (start > cursor) gaps.push([cursor, start]);
    cursor = Math.max(cursor, end);
  });
  if (cursor < 1440) gaps.push([cursor, 1440]);
  return gaps;
}

export function formatKoreanRange(days: string[]) {
  const start = toDate(days[0]);
  const end = toDate(days[6]);
  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

export function dayLabel(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric', weekday: 'short',
  }).format(toDate(date));
}

export function fullDateLabel(date: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(toDate(date));
}

export function employeeName(id: string, employees: Employee[]) {
  return employees.find((employee) => employee.id === id)?.name ?? id;
}

export function templateById(id: string, templates: ShiftTemplate[]) {
  return templates.find((template) => template.id === id) ?? templates[0];
}

export function sortByTime(shifts: Shift[]) {
  const scheduleStart = 8 * 60;

  return [...shifts].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.time.split('-')[0]);
    const bStart = parseTimeToMinutes(b.time.split('-')[0]);
    const aOrder =
      aStart === null ? Number.MAX_SAFE_INTEGER : (aStart - scheduleStart + 1440) % 1440;
    const bOrder =
      bStart === null ? Number.MAX_SAFE_INTEGER : (bStart - scheduleStart + 1440) % 1440;

    return aOrder - bOrder || a.time.localeCompare(b.time);
  });
}
