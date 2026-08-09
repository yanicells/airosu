import { useAppState } from '../appState';
import { defaultSettings } from '../appState';
import { KeyBindingEditor } from '../shared/KeyBindingEditor';
import { SliderRow, ToggleRow, SelectRow } from './rows';

const INPUT_MODE_OPTIONS = [
  { value: 'relax', label: 'Relax', description: 'Automatic taps while you aim' },
  { value: 'manual', label: 'Manual', description: 'Keyboard taps while you aim' },
];

const CURSOR_OPTIONS = [
  { value: 'palm', label: 'Palm', description: 'Stable whole-hand aiming' },
  { value: 'index', label: 'Index fingertip', description: 'Precise pointing control' },
];

const VISUAL_MODE_OPTIONS = [
  { value: 'arcade', label: 'Arcade', description: 'Camera background' },
  { value: 'focus', label: 'Focus', description: 'Dark background' },
];

export function SettingsScreen() {
  const { settings, setSettings, setScreen } = useAppState();
  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings({ ...settings, [key]: value });

  return (
    <main className="settings-screen">
      <div className="settings-panel panel fade-up">
        <header className="settings-header">
          <span className="eyebrow">Tune your play</span>
          <h2>Settings</h2>
        </header>

        <section className="settings-group" aria-labelledby="cursor-feel-heading">
          <h3 id="cursor-feel-heading">Cursor feel</h3>
          <SliderRow
            label="Sensitivity"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.sensitivity}
            onChange={(v) => set('sensitivity', v)}
            hint="Higher means smaller hand motion covers the playfield"
          />
          <SliderRow
            label="Smoothing"
            min={0}
            max={1}
            step={0.05}
            value={settings.smoothing}
            onChange={(v) => set('smoothing', v)}
            hint="Higher means a steadier cursor with more lag"
          />
          <SliderRow
            label="Forgiveness"
            min={1}
            max={2.5}
            step={0.1}
            value={settings.forgiveness}
            onChange={(v) => set('forgiveness', v)}
            hint="Expands hit windows and circle radius"
          />
        </section>

        <section className="settings-group" aria-labelledby="gameplay-heading">
          <h3 id="gameplay-heading">Gameplay</h3>
          <SliderRow
            label="Audio offset (ms)"
            min={-200}
            max={200}
            step={5}
            value={settings.audioOffsetMs}
            onChange={(v) => set('audioOffsetMs', v)}
            hint="Use a positive value when hits feel late"
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
            options={INPUT_MODE_OPTIONS}
            onChange={(v) => set('inputMode', v as 'relax' | 'manual')}
          />
          <SelectRow
            label="Cursor anchor"
            value={settings.cursorAnchor}
            options={CURSOR_OPTIONS}
            onChange={(v) => set('cursorAnchor', v as 'palm' | 'index')}
          />
          <SelectRow
            label="Visual mode"
            value={settings.visualMode}
            options={VISUAL_MODE_OPTIONS}
            onChange={(v) => set('visualMode', v as 'arcade' | 'focus')}
          />
        </section>

        <section className="settings-group" aria-labelledby="manual-input-heading">
          <h3 id="manual-input-heading">Manual input</h3>
          <div className="setting-row setting-row--keys">
            <span className="setting-label">Tap keys</span>
            <KeyBindingEditor value={settings.tapKeys} onChange={(keys) => set('tapKeys', keys)} />
          </div>
        </section>

        <div className="settings-actions">
          <button className="btn btn--primary" onClick={() => setScreen('home')}>
            Done
          </button>
          <button className="btn" onClick={() => setSettings({ ...defaultSettings })}>
            Reset to defaults
          </button>
        </div>
      </div>
    </main>
  );
}
