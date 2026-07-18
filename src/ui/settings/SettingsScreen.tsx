import { useAppState } from '../appState';
import { defaultSettings } from '../appState';
import { SliderRow, ToggleRow, SelectRow } from './rows';

export function SettingsScreen() {
  const { settings, setSettings, setScreen } = useAppState();
  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings({ ...settings, [key]: value });

  return (
    <div
      className="panel fade-up"
      style={{
        maxWidth: 560,
        margin: '32px auto',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h2 style={{ margin: '0 0 8px' }}>Settings</h2>
      <SliderRow
        label="Sensitivity"
        min={0.5}
        max={2}
        step={0.05}
        value={settings.sensitivity}
        onChange={(v) => set('sensitivity', v)}
        hint="Higher = smaller hand motion covers the playfield"
      />
      <SliderRow
        label="Smoothing"
        min={0}
        max={1}
        step={0.05}
        value={settings.smoothing}
        onChange={(v) => set('smoothing', v)}
        hint="Higher = steadier cursor, more lag"
      />
      <SliderRow
        label="Forgiveness"
        min={1}
        max={2.5}
        step={0.1}
        value={settings.forgiveness}
        onChange={(v) => set('forgiveness', v)}
        hint="Multiplies hit windows and circle radius"
      />
      <SliderRow
        label="Audio offset (ms)"
        min={-200}
        max={200}
        step={5}
        value={settings.audioOffsetMs}
        onChange={(v) => set('audioOffsetMs', v)}
        hint="Positive if hits feel late"
      />
      <SliderRow
        label="Volume"
        min={0}
        max={1}
        step={0.05}
        value={settings.volume}
        onChange={(v) => set('volume', v)}
      />
      <ToggleRow
        label="Mirror camera"
        value={settings.mirror}
        onChange={(v) => set('mirror', v)}
      />
      <SelectRow
        label="Input mode"
        value={settings.inputMode}
        options={[
          { value: 'relax', label: 'Relax (auto-tap)' },
          { value: 'manual', label: 'Manual (keyboard taps)' },
        ]}
        onChange={(v) => set('inputMode', v as 'relax' | 'manual')}
      />
      <SelectRow
        label="Cursor anchor"
        value={settings.cursorAnchor}
        options={[
          { value: 'palm', label: 'Palm (stable)' },
          { value: 'index', label: 'Index fingertip (precise)' },
        ]}
        onChange={(v) => set('cursorAnchor', v as 'palm' | 'index')}
      />
      <SelectRow
        label="Visual mode"
        value={settings.visualMode}
        options={[
          { value: 'arcade', label: 'Arcade (camera background)' },
          { value: 'focus', label: 'Focus (dark background)' },
        ]}
        onChange={(v) => set('visualMode', v as 'arcade' | 'focus')}
      />
      <label style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>Tap keys (manual mode)</span>
        <input
          value={settings.tapKeys.join(',')}
          onChange={(e) =>
            set(
              'tapKeys',
              e.target.value
                .split(',')
                .map((k) => (k === 'space' ? ' ' : k.trim().toLowerCase()))
                .filter(Boolean),
            )
          }
          style={{ width: 120 }}
        />
      </label>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className="btn btn--primary" style={{ fontSize: 16 }} onClick={() => setScreen('home')}>
          Done
        </button>
        <button className="btn" onClick={() => setSettings({ ...defaultSettings })}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
