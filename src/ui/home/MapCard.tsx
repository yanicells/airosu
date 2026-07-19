import type { LoadedBeatmap } from '../../beatmap/model';
import type { Settings } from '../appState';

function fmtLength(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const STAT_KEYS = ['ar', 'cs', 'od', 'hp'] as const;

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

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 14 }}>
            Mode{' '}
            <select
              value={settings.inputMode}
              onChange={(e) =>
                setSettings({ ...settings, inputMode: e.target.value as 'relax' | 'manual' })
              }
            >
              <option value="relax">Relax (auto-tap)</option>
              <option value="manual">Manual (Z/X to tap)</option>
            </select>
          </label>
          <label style={{ fontSize: 14 }}>
            Cursor{' '}
            <select
              value={settings.cursorAnchor}
              onChange={(e) =>
                setSettings({ ...settings, cursorAnchor: e.target.value as 'palm' | 'index' })
              }
            >
              <option value="palm">Palm</option>
              <option value="index">Index fingertip</option>
            </select>
          </label>
          <label style={{ fontSize: 14 }}>
            Visuals{' '}
            <select
              value={settings.visualMode}
              onChange={(e) =>
                setSettings({ ...settings, visualMode: e.target.value as 'arcade' | 'focus' })
              }
            >
              <option value="arcade">Arcade (camera bg)</option>
              <option value="focus">Focus (dark bg)</option>
            </select>
          </label>
        </div>

        <button className="btn btn--primary" style={{ alignSelf: 'center' }} onClick={onPlay}>
          Play!
        </button>
      </div>
    </div>
  );
}
