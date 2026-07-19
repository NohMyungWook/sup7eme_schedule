import { isValidDate, parseTimeToMinutes } from '../shared/schedule.js';
import { ApiError } from './_db.js';

const ID_PATTERN = /^[a-zA-Z0-9:_-]{1,100}$/;
const HEX_OR_TOKEN_COLOR = /^(#[0-9a-fA-F]{6}|[a-zA-Z0-9_-]{1,40})$/;

export function assertId(value, label = 'ID') {
  const id = String(value ?? '').trim();
  if (!ID_PATTERN.test(id)) throw new ApiError(400, `${label} 형식이 올바르지 않습니다.`);
  return id;
}

export function assertOptionalId(value, label = 'ID') {
  if (value === null || value === undefined || value === '') return null;
  return assertId(value, label);
}

export function assertText(value, label, maxLength, required = true) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new ApiError(400, `${label}을(를) 입력해주세요.`);
  if (text.length > maxLength) throw new ApiError(400, `${label}은(는) ${maxLength}자 이하로 입력해주세요.`);
  return text;
}

export function assertDate(value, label = '날짜') {
  const date = String(value ?? '');
  if (!isValidDate(date)) throw new ApiError(400, `${label} 형식이 올바르지 않습니다.`);
  return date;
}

export function assertMonth(value) {
  const month = String(value ?? '');
  if (!/^\d{4}-\d{2}$/.test(month) || !isValidDate(`${month}-01`)) {
    throw new ApiError(400, '조회 월 형식이 올바르지 않습니다.');
  }
  return month;
}

export function assertTime(value, label, allow24 = true) {
  const time = String(value ?? '');
  if (parseTimeToMinutes(time, allow24) === null) throw new ApiError(400, `${label} 형식이 올바르지 않습니다.`);
  return time;
}

export function assertColor(value, fallback = '#6654e8') {
  const color = String(value ?? fallback).trim();
  if (!HEX_OR_TOKEN_COLOR.test(color)) throw new ApiError(400, '표시 색상 형식이 올바르지 않습니다.');
  return color;
}

export function assertBoolean(value, fallback = false) {
  return value === undefined ? fallback : Boolean(value);
}

export function uniqueIds(values, label = 'ID') {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => assertId(value, label)))];
}

export function queryParams(request) {
  return new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).searchParams;
}

export function assertDateRange(startDate, endDate, maxDays = 370) {
  const start = assertDate(startDate, '시작일');
  const end = assertDate(endDate, '종료일');
  const diff = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
  if (diff < 0) throw new ApiError(400, '종료일은 시작일보다 빠를 수 없습니다.');
  if (diff > maxDays) throw new ApiError(400, `조회 기간은 최대 ${maxDays}일입니다.`);
  return { startDate: start, endDate: end };
}

export function toDateString(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

export function normalizeDbTime(value) {
  return value === null || value === undefined ? null : String(value).slice(0, 5);
}
