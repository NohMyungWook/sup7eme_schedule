import { useEffect, useId, useRef, useState } from 'react';
import { toDate } from '../../utils/schedule';
import { DateRangeCalendar } from './DateRangeCalendar';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
};

export function DatePicker({ value, onChange, ariaLabel = '날짜 선택', disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  return <div className={`custom-date-picker${isOpen ? ' is-open' : ''}`} ref={rootRef}>
    <button
      type="button"
      className="custom-date-picker__trigger"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={calendarId}
      disabled={disabled}
      onClick={() => setIsOpen((current) => !current)}
    >
      <span>{formatDateLabel(value)}</span><i aria-hidden="true">⌄</i>
    </button>
    {isOpen ? <div className="custom-date-picker__popover" id={calendarId} role="dialog" aria-label={ariaLabel}>
      <DateRangeCalendar
        startDate={value}
        endDate={value}
        onChange={(date) => {
          onChange(date);
          setIsOpen(false);
        }}
      />
    </div> : null}
  </div>;
}

function formatDateLabel(value: string) {
  if (!value) return '날짜를 선택하세요';
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(toDate(value));
}
