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
