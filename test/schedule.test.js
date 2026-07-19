import test from 'node:test';
import assert from 'node:assert/strict';
import {
  minutesWithinMonth,
  shiftDurationMinutes,
  shiftsOverlap,
} from '../shared/schedule.js';

test('야간 근무 시간을 익일 종료로 계산한다', () => {
  assert.equal(shiftDurationMinutes('22:00', '08:00'), 600);
});

test('24:00 종료와 같은 시작·종료 정책을 일관되게 처리한다', () => {
  assert.equal(shiftDurationMinutes('19:00', '24:00'), 300);
  assert.equal(shiftDurationMinutes('08:00', '08:00'), 0);
});

test('월 경계를 넘는 근무는 각 월에 포함된 시간만 집계한다', () => {
  assert.equal(minutesWithinMonth('2026-07-31', '22:00', '08:00', '2026-07'), 120);
  assert.equal(minutesWithinMonth('2026-07-31', '22:00', '08:00', '2026-08'), 480);
});

test('같은 날과 익일 야간 근무의 시간 겹침을 판정한다', () => {
  assert.equal(shiftsOverlap(
    { date: '2026-07-20', startTime: '22:00', endTime: '08:00' },
    { date: '2026-07-21', startTime: '07:30', endTime: '09:00' },
  ), true);
  assert.equal(shiftsOverlap(
    { date: '2026-07-20', startTime: '08:00', endTime: '15:00' },
    { date: '2026-07-20', startTime: '15:00', endTime: '22:00' },
  ), false);
});
