const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export function isValidDate(value) {
  if (!DATE_PATTERN.test(String(value))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function parseTimeToMinutes(value, allow24 = false) {
  const normalized = String(value ?? '');
  if (!TIME_PATTERN.test(normalized)) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (hours === 24 && (!allow24 || minutes !== 0)) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1440) return '';
  if (value === 1440) return '24:00';
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function splitShiftTime(time) {
  const [startTime = '', endTime = ''] = String(time ?? '').split('-');
  return { startTime, endTime };
}

export function shiftDurationMinutes(startTime, endTime) {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime, true);
  if (start === null || end === null || start === end) return 0;
  if (end <= start) end += 1440;
  return end - start;
}

export function shiftBounds(workDate, startTime, endTime) {
  if (!isValidDate(workDate)) return null;
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime, true);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return null;
  if (endMinutes <= startMinutes) endMinutes += 1440;
  const dayStart = dateToDayNumber(workDate) * 1440;
  return { start: dayStart + startMinutes, end: dayStart + endMinutes };
}

export function shiftsOverlap(left, right) {
  const leftBounds = shiftBounds(left.date, left.startTime, left.endTime);
  const rightBounds = shiftBounds(right.date, right.startTime, right.endTime);
  if (!leftBounds || !rightBounds) return false;
  return leftBounds.start < rightBounds.end && rightBounds.start < leftBounds.end;
}

export function coverageGapsForDate(date, shifts) {
  if (!isValidDate(date) || !Array.isArray(shifts)) return [[0, 1440]];

  const dayStart = dateToDayNumber(date) * 1440;
  const dayEnd = dayStart + 1440;
  const intervals = shifts
    .map((shift) => shiftBounds(shift.date, shift.startTime, shift.endTime))
    .filter(Boolean)
    .map((bounds) => [Math.max(bounds.start, dayStart), Math.min(bounds.end, dayEnd)])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);

  const merged = intervals.reduce((result, [start, end]) => {
    const last = result[result.length - 1];
    if (!last || start > last[1]) result.push([start, end]);
    else last[1] = Math.max(last[1], end);
    return result;
  }, []);

  const gaps = [];
  let cursor = dayStart;
  for (const [start, end] of merged) {
    if (start > cursor) gaps.push([cursor - dayStart, start - dayStart]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < dayEnd) gaps.push([cursor - dayStart, 1440]);
  return gaps;
}

export function dateInRange(date, startDate, endDate) {
  return isValidDate(date)
    && isValidDate(startDate)
    && isValidDate(endDate)
    && startDate <= date
    && date <= endDate;
}

export function leaveDateRangeConflictsShift(range, shift) {
  if (!dateInRange(range.startDate, range.startDate, range.endDate)) return false;
  if (dateInRange(shift.date, range.startDate, range.endDate)) return true;
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime, true);
  if (start === null || end === null || end > start) return false;
  return dateInRange(addDateDays(shift.date, 1), range.startDate, range.endDate);
}

export function minutesWithinMonth(workDate, startTime, endTime, month) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) return 0;
  const bounds = shiftBounds(workDate, startTime, endTime);
  if (!bounds) return 0;
  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = Date.UTC(year, monthNumber - 1, 1) / 86_400_000 * 1440;
  const monthEnd = Date.UTC(year, monthNumber, 1) / 86_400_000 * 1440;
  return Math.max(0, Math.min(bounds.end, monthEnd) - Math.max(bounds.start, monthStart));
}

export function addDateDays(value, amount) {
  if (!isValidDate(value) || !Number.isInteger(amount)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dateToDayNumber(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}
