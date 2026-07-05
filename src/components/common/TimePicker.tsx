import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

export function TimePicker({ value, onChange, ariaLabel = '시간' }: TimePickerProps) {
  const [initialHour, initialMinute] = splitTime(value);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  useEffect(() => {
    const [nextHour, nextMinute] = splitTime(value);
    setHour(nextHour);
    setMinute(nextMinute);
  }, [value]);

  function updatePart(
    event: ChangeEvent<HTMLInputElement>,
    part: 'hour' | 'minute',
  ) {
    const nextValue = event.target.value.replace(/\D/g, '').slice(0, 2);
    if (part === 'hour') setHour(nextValue);
    else setMinute(nextValue);

    if (nextValue.length === 2) {
      commit(part === 'hour' ? nextValue : hour, part === 'minute' ? nextValue : minute);
    }
  }

  function commit(hourValue = hour, minuteValue = minute) {
    const nextHour = normalizePart(hourValue, 23);
    const nextMinute = normalizePart(minuteValue, 59);
    setHour(nextHour);
    setMinute(nextMinute);
    onChange(`${nextHour}:${nextMinute}`);
  }

  function finishOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <div className="time-input-fields">
      <div className="time-input-part">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={hour}
          aria-label={`${ariaLabel} 시`}
          onChange={(event) => updatePart(event, 'hour')}
          onBlur={() => commit()}
          onKeyDown={finishOnEnter}
        />
        <span>시</span>
      </div>
      <i aria-hidden="true">:</i>
      <div className="time-input-part">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={minute}
          aria-label={`${ariaLabel} 분`}
          onChange={(event) => updatePart(event, 'minute')}
          onBlur={() => commit()}
          onKeyDown={finishOnEnter}
        />
        <span>분</span>
      </div>
    </div>
  );
}

function splitTime(value: string) {
  const [hour = '00', minute = '00'] = value.split(':');
  return [normalizePart(hour, 23), normalizePart(minute, 59)];
}

function normalizePart(value: string, max: number) {
  const number = Number(value);
  const normalized = Number.isFinite(number) ? Math.min(Math.max(number, 0), max) : 0;
  return String(normalized).padStart(2, '0');
}
