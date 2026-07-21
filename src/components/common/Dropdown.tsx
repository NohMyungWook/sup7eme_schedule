import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = '선택하세요',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  function open() {
    if (disabled || !options.length) return;
    setIsOpen(true);
    requestAnimationFrame(() => {
      optionRefs.current[Math.max(selectedIndex, 0)]?.focus();
    });
  }

  function close(returnFocus = false) {
    setIsOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function select(option: DropdownOption) {
    onChange(option.value);
    close(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }

    const nextIndex =
      event.key === 'ArrowDown'
        ? (index + 1) % options.length
        : event.key === 'ArrowUp'
          ? (index - 1 + options.length) % options.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? options.length - 1
              : null;

    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div className={`custom-dropdown ${isOpen ? 'is-open' : ''}`} ref={rootRef}>
      <button
        className="custom-dropdown__trigger"
        type="button"
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <i aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="custom-dropdown__menu" id={listboxId} role="listbox">
          {options.map((option, index) => (
            <button
              className={`custom-dropdown__option ${option.value === value ? 'is-selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              onClick={() => select(option)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span>{option.label}</span>
              {option.value === value ? <strong aria-hidden="true">✓</strong> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
