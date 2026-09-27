import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { SelectMenu } from '../shared/SelectMenu';
import type { SelectMenuOption } from '../shared/SelectMenu';

/** Current settings search text; rows whose label doesn't match hide themselves. */
export const SettingsQuery = createContext('');

function useVisible(label: string, keywords = '') {
  const query = useContext(SettingsQuery).trim().toLowerCase();
  return !query || `${label} ${keywords}`.toLowerCase().includes(query);
}

/** A labelled row for custom controls (key bindings, buttons) that still honours search. */
export function SettingRow({
  label,
  keywords,
  children,
}: {
  label: string;
  keywords?: string;
  children: ReactNode;
}) {
  if (!useVisible(label, keywords)) return null;
  return (
    <div className="setting-row setting-row--stacked">
      <span className="setting-label">{label}</span>
      {children}
    </div>
  );
}

export function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  hint,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  if (!useVisible(label, hint)) return null;
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="setting-row setting-row--stacked">
      <span className="setting-label">
        {label}
        <output>{value}</output>
      </span>
      <input
        className="lz-slider"
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--progress': `${progress}%` } as CSSProperties}
      />
      {hint && <span className="setting-hint">{hint}</span>}
    </label>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  if (!useVisible(label, hint)) return null;
  return (
    <label className="setting-row setting-row--inline">
      <span className="setting-label">{label}</span>
      <input
        className="lz-toggle"
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {hint && <span className="setting-hint">{hint}</span>}
    </label>
  );
}

export function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectMenuOption[];
  onChange: (v: string) => void;
}) {
  if (!useVisible(label, options.map((option) => option.label).join(' '))) return null;
  return (
    <div className="setting-row setting-row--stacked">
      <span className="setting-label">{label}</span>
      <SelectMenu ariaLabel={label} value={value} options={options} onChange={onChange} />
    </div>
  );
}
