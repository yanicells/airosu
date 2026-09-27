import type { CSSProperties } from 'react';
import type { LoadedBeatmap } from '../../beatmap/model';
import { ClockIcon, TargetIcon } from '../shared/icons';
import { starColor } from './starColor';

function Attribute({ label, value, fill }: { label: string; value: string; fill: number }) {
  return (
    <div className="wedge-attribute">
      <i style={{ '--fill': `${Math.min(100, Math.max(0, fill * 100))}%` } as CSSProperties} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** The top-left wedge: title, artist, map stats, the difficulty strip, and attribute bars. */
export function BeatmapWedge({ map, stars }: { map: LoadedBeatmap; stars?: number }) {
  const seconds = Math.round(map.meta.lengthMs / 1000);
  const kinds = { circle: 0, slider: 0, spinner: 0 };
  for (const object of map.objects) kinds[object.kind]++;
  const total = Math.max(1, map.objects.length);
  const color = stars === undefined ? '#aaaaaa' : starColor(stars);
  return (
    <section className="beatmap-wedge">
      <div className="wedge-title">
        <h1>{map.meta.title}</h1>
        <p>{map.meta.artist}</p>
        <div className="wedge-meta">
          <span>
            <ClockIcon size={17} /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
          <span>♫ {Math.round(map.meta.bpm)} bpm</span>
          <span>
            <TargetIcon size={17} /> {map.objects.length}
          </span>
        </div>
      </div>
      <div className="wedge-difficulty">
        <span
          className="star-pill"
          style={{ '--star-color': color, color: (stars ?? 0) >= 6.5 ? '#ffd966' : undefined } as CSSProperties}
        >
          ★ {stars?.toFixed(2) ?? '—'}
        </span>
        <strong>{map.meta.version}</strong>
        <span>
          mapped by <strong>{map.meta.creator}</strong>
        </span>
      </div>
      <div className="wedge-attributes">
        <Attribute label="Circles" value={String(kinds.circle)} fill={kinds.circle / total} />
        <Attribute label="Sliders" value={String(kinds.slider)} fill={kinds.slider / total} />
        <Attribute label="Spinners" value={String(kinds.spinner)} fill={kinds.spinner / total} />
        <span className="wedge-gap" />
        <Attribute label="Circle Size" value={fmt(map.meta.cs)} fill={map.meta.cs / 10} />
        <Attribute label="Approach Rate" value={fmt(map.meta.ar)} fill={map.meta.ar / 10} />
        <Attribute label="Accuracy" value={fmt(map.meta.od)} fill={map.meta.od / 10} />
        <Attribute label="HP Drain" value={fmt(map.meta.hp)} fill={map.meta.hp / 10} />
      </div>
    </section>
  );
}

const fmt = (value: number) => String(Math.round(value * 10) / 10);
