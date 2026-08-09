import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  addKeyBinding,
  keyBindingLabel,
  normalizeCapturedKey,
  removeKeyBinding,
} from './keyBindings';

export function KeyBindingEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [capturing, setCapturing] = useState(false);

  const onCaptureKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!capturing) {
      if (event.key === 'Backspace' && value.length > 1) {
        event.preventDefault();
        onChange(value.slice(0, -1));
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setCapturing(false);
      return;
    }
    const key = normalizeCapturedKey(event.key);
    if (!key) return;
    event.preventDefault();
    onChange(addKeyBinding(value, key));
    setCapturing(false);
  };

  return (
    <div className="key-editor">
      <div className="key-editor__chips" aria-label="Manual tap keys">
        {value.map((key) => (
          <span key={key} className="key-chip">
            <kbd>{keyBindingLabel(key)}</kbd>
            <button
              type="button"
              aria-label={`Remove ${keyBindingLabel(key)} binding`}
              disabled={value.length === 1}
              onClick={() => onChange(removeKeyBinding(value, key))}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          className="key-editor__capture"
          data-capturing={capturing}
          onClick={() => setCapturing(true)}
          onKeyDown={onCaptureKey}
          onBlur={() => setCapturing(false)}
        >
          {capturing ? 'Press any key…' : '+ Add key'}
        </button>
      </div>
      <span className="setting-hint">
        {capturing ? 'Escape cancels' : 'Select Add key, then press your preferred tap key'}
      </span>
    </div>
  );
}
