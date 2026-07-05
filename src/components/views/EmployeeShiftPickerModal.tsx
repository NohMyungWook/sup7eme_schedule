import { useEffect, useRef } from 'react';
import type { ShiftTemplate } from '../../domain/types';
import { dayLabel } from '../../utils/schedule';

type EmployeeShiftPickerModalProps = {
  employeeName: string;
  date: string;
  templates: ShiftTemplate[];
  onSelect: (templateId: string) => void;
  onClose: () => void;
};

export function EmployeeShiftPickerModal({
  employeeName,
  date,
  templates,
  onSelect,
  onClose,
}: EmployeeShiftPickerModalProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="shift-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-picker-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <header>
          <div>
            <h2 id="shift-picker-title">근무 시간대 선택</h2>
            <p>{dayLabel(date)} · {employeeName}</p>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>
        <div className="shift-picker-options">
          {templates.map((template) => (
            <button
              className={`shift-picker-option ${template.color}`}
              type="button"
              key={template.id}
              ref={template === templates[0] ? firstOptionRef : undefined}
              onClick={() => onSelect(template.id)}
            >
              <span>{template.label}</span>
              <strong>
                {template.requiresTimeInput ? '직접 입력' : template.time}
              </strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
