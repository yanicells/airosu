import { SelectMenu } from '../shared/SelectMenu';
import type { SelectMenuOption } from '../shared/SelectMenu';

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
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <div className="setting-block">
      <label className="setting-row">
        <span className="setting-label">{label}</span>
        <span className="range-control">
          <input
            type="range"
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              background: `linear-gradient(90deg, var(--pink) ${progress}%, rgba(255,255,255,0.13) ${progress}%)`,
            }}
          />
          <output>{value}</output>
        </span>
      </label>
      {hint && <span className="setting-hint">{hint}</span>}
    </div>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span className="setting-label">{label}</span>
      <span className="toggle-control">
        <input
          type="checkbox"
          aria-label={label}
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-control__track" aria-hidden="true">
          <span />
        </span>
        <span className="toggle-control__state">{value ? 'On' : 'Off'}</span>
      </span>
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
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <SelectMenu
        ariaLabel={label}
        value={value}
        options={options}
        onChange={onChange}
        align="end"
      />
    </div>
  );
}
