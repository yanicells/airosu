import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { moveOptionIndex } from './selectMenuNavigation';
import type { SelectMenuMove } from './selectMenuNavigation';

export interface SelectMenuOption {
  value: string;
  label: string;
  description?: string;
}

export function SelectMenu({
  ariaLabel,
  value,
  options,
  onChange,
  align = 'start',
  className = '',
}: {
  ariaLabel: string;
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  align?: 'start' | 'end';
  className?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex] ?? options[0];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    listboxRef.current?.focus();
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  const openFromTrigger = (move?: 'next' | 'previous') => {
    setActiveIndex(
      move ? moveOptionIndex(selectedIndex, move, options.length) : Math.max(selectedIndex, 0),
    );
    setOpen(true);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openFromTrigger(event.key === 'ArrowDown' ? 'next' : 'previous');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFromTrigger();
    }
  };

  const onListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, SelectMenuMove | undefined> = {
      ArrowDown: 'next',
      ArrowUp: 'previous',
      Home: 'first',
      End: 'last',
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setActiveIndex((index) => moveOptionIndex(index, move, options.length));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div ref={rootRef} className={`select-menu ${className}`.trim()} data-open={open}>
      <button
        ref={triggerRef}
        type="button"
        className="select-menu__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? close(false) : openFromTrigger())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="select-menu__value">{selected?.label ?? 'Choose an option'}</span>
        <span className="select-menu__chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          className="select-menu__list"
          data-align={align}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          tabIndex={-1}
          onKeyDown={onListboxKeyDown}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-${index}`}
              type="button"
              tabIndex={-1}
              className="select-menu__option"
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span>
                <strong>{option.label}</strong>
                {option.description && <small>{option.description}</small>}
              </span>
              <span className="select-menu__check" aria-hidden="true">
                {option.value === value ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
