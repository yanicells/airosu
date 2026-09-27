import type { ReactNode } from 'react';
import { defaultSettings, useAppState, type Settings } from '../appState';
import { KeyBindingEditor } from '../shared/KeyBindingEditor';
import { HandIcon, KeyboardIcon, PlayCircleIcon, SpeakerIcon, WrenchIcon } from '../shared/icons';
import { SelectRow, SettingRow, SliderRow, ToggleRow } from './rows';

export const SECTIONS = [
  { id: 'cursor', label: 'Cursor', icon: <HandIcon size={22} /> },
  { id: 'gameplay', label: 'Gameplay', icon: <PlayCircleIcon size={22} /> },
  { id: 'audio', label: 'Audio', icon: <SpeakerIcon size={22} /> },
  { id: 'input', label: 'Input', icon: <KeyboardIcon size={22} /> },
  { id: 'maintenance', label: 'Maintenance', icon: <WrenchIcon size={22} /> },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} className="settings-section" aria-labelledby={`settings-${id}-title`}>
      <h3 id={`settings-${id}-title`}>{title}</h3>
      {children}
    </section>
  );
}

/** Every setting, grouped the way lazer groups its sidebar sections. */
export function SettingsSections() {
  const { settings, setSettings } = useAppState();
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings({ ...settings, [key]: value });

  return (
    <>
      <Section id="cursor" title="Cursor">
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
        <SelectRow
          label="Cursor anchor"
          value={settings.cursorAnchor}
          options={[
            { value: 'palm', label: 'Palm', description: 'Stable whole-hand aiming' },
            { value: 'index', label: 'Index fingertip', description: 'Precise pointing control' },
          ]}
          onChange={(v) => set('cursorAnchor', v as Settings['cursorAnchor'])}
        />
        <ToggleRow label="Mirror camera" value={settings.mirror} onChange={(v) => set('mirror', v)} />
      </Section>

      <Section id="gameplay" title="Gameplay">
        <SelectRow
          label="Input mode"
          value={settings.inputMode}
          options={[
            { value: 'relax', label: 'Relax', description: 'Automatic taps while you aim' },
            { value: 'manual', label: 'Manual', description: 'Keyboard taps while you aim' },
          ]}
          onChange={(v) => set('inputMode', v as Settings['inputMode'])}
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
        <SelectRow
          label="Visual mode"
          value={settings.visualMode}
          options={[
            { value: 'arcade', label: 'Arcade', description: 'Camera background' },
            { value: 'focus', label: 'Focus', description: 'Dark background' },
          ]}
          onChange={(v) => set('visualMode', v as Settings['visualMode'])}
        />
      </Section>

      <Section id="audio" title="Audio">
        <SliderRow
          label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(v) => set('volume', v)}
        />
        <SliderRow
          label="Audio offset (ms)"
          min={-200}
          max={200}
          step={5}
          value={settings.audioOffsetMs}
          onChange={(v) => set('audioOffsetMs', v)}
          hint="Use a positive value when hits feel late"
        />
      </Section>

      <Section id="input" title="Input">
        <SettingRow label="Tap keys" keywords="manual keyboard bindings">
          <KeyBindingEditor value={settings.tapKeys} onChange={(keys) => set('tapKeys', keys)} />
        </SettingRow>
      </Section>

      <Section id="maintenance" title="Maintenance">
        <SettingRow label="Reset to defaults" keywords="restore">
          <button className="lz-button lz-button--yellow" onClick={() => setSettings({ ...defaultSettings })}>
            Reset all settings to defaults
          </button>
        </SettingRow>
      </Section>
    </>
  );
}
