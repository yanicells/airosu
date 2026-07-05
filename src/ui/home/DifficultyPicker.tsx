import type { MapsetPreview } from '../../beatmap/load';
import { starColor } from './starColor';

/** Difficulty pills with osu! star-spectrum colours; stays visible so the
 * player can switch difficulty without going back. */
export function DifficultyPicker({
  difficulties,
  active,
  onPick,
}: {
  difficulties: MapsetPreview['difficulties'];
  active?: string;
  onPick: (name: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        maxWidth: 640,
      }}
    >
      {difficulties.map((d) => {
        const color = starColor(d.stars);
        const isActive = d.name === active;
        return (
          <button
            key={d.name}
            className="btn"
            style={{
              borderColor: color,
              boxShadow: isActive ? `0 0 16px ${color}` : undefined,
              background: isActive ? 'rgba(60, 45, 80, 0.95)' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
            }}
            onClick={() => onPick(d.name)}
          >
            <span style={{ color, fontWeight: 800 }}>★ {d.stars.toFixed(2)}</span>
            <span>{d.name}</span>
          </button>
        );
      })}
    </div>
  );
}
