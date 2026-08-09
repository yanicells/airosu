import type { LoadedBeatmap } from '../../beatmap/model';
import type { Settings } from '../appState';
import { SelectMenu } from '../shared/SelectMenu';

function fmtLength(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const STAT_KEYS = ['ar', 'cs', 'od', 'hp'] as const;

const INPUT_MODE_OPTIONS = [
  { value: 'relax', label: 'Relax', description: 'Aim only — taps happen automatically' },
  { value: 'manual', label: 'Manual', description: 'Aim with your hand, tap with Z / X' },
];

const CURSOR_OPTIONS = [
  { value: 'palm', label: 'Palm', description: 'Stable whole-hand aiming' },
  { value: 'index', label: 'Index fingertip', description: 'Precise pointing control' },
];

const VISUAL_OPTIONS = [
  { value: 'arcade', label: 'Arcade', description: 'Camera behind the playfield' },
  { value: 'focus', label: 'Focus', description: 'Dark, distraction-free background' },
];

/** Song-select style card: map background, stats and the Play action. */
export function MapCard({
  map,
  bgUrl,
  settings,
  setSettings,
  onPlay,
}: {
  map: LoadedBeatmap;
  bgUrl?: string;
  settings: Settings;
  setSettings: (s: Settings) => void;
  onPlay: () => void;
}) {
  const circles = map.objects.filter((o) => o.kind === 'circle').length;
  const sliders = map.objects.filter((o) => o.kind === 'slider').length;

  return (
    <div className="panel fade-up" style={{ width: 620, maxWidth: '92vw', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          padding: '28px 28px 20px',
          backgroundImage: bgUrl
            ? `linear-gradient(180deg, rgba(23,17,31,0.55), rgba(23,17,31,0.92)), url(${bgUrl})`
            : 'linear-gradient(135deg, #2a1f3d, #1c1428)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>{map.meta.title}</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-dim)', fontWeight: 600 }}>
          {map.meta.artist}
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 14 }}>
          <span style={{ color: 'var(--pink)', fontWeight: 700 }}>[{map.meta.version}]</span>{' '}
          <span style={{ color: 'var(--ink-dim)' }}>mapped by {map.meta.creator}</span>
        </p>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 13, fontWeight: 600 }}>
          <span>⏱ {fmtLength(map.meta.lengthMs)}</span>
          <span>♪ {Math.round(map.meta.bpm)} BPM</span>
          <span>◯ {circles} circles</span>
          <span>〜 {sliders} sliders</span>
        </div>
      </div>

      <div style={{ padding: '16px 28px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 28px' }}>
          {STAT_KEYS.map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="eyebrow" style={{ width: 24 }}>
                {k}
              </span>
              <div className="statbar" style={{ flex: 1 }}>
                <div style={{ width: `${Math.min(map.meta[k] / 10, 1) * 100}%` }} />
              </div>
              <span style={{ fontSize: 13, width: 28, textAlign: 'right', fontWeight: 700 }}>
                {map.meta[k].toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <div className="map-options">
          <div className="map-option">
            <span className="eyebrow">Mode</span>
            <SelectMenu
              ariaLabel="Input mode"
              value={settings.inputMode}
              options={INPUT_MODE_OPTIONS}
              onChange={(inputMode) =>
                setSettings({ ...settings, inputMode: inputMode as 'relax' | 'manual' })
              }
            />
          </div>
          <div className="map-option">
            <span className="eyebrow">Cursor</span>
            <SelectMenu
              ariaLabel="Cursor anchor"
              value={settings.cursorAnchor}
              options={CURSOR_OPTIONS}
              onChange={(cursorAnchor) =>
                setSettings({ ...settings, cursorAnchor: cursorAnchor as 'palm' | 'index' })
              }
            />
          </div>
          <div className="map-option">
            <span className="eyebrow">Visuals</span>
            <SelectMenu
              ariaLabel="Visual mode"
              value={settings.visualMode}
              options={VISUAL_OPTIONS}
              onChange={(visualMode) =>
                setSettings({ ...settings, visualMode: visualMode as 'arcade' | 'focus' })
              }
            />
          </div>
        </div>

        <button className="btn btn--primary" style={{ alignSelf: 'center' }} onClick={onPlay}>
          Play!
        </button>
      </div>
    </div>
  );
}
