import type { CSSProperties } from 'react';
import type { Mapset } from '../appState';
import { starColor } from './starColor';

export function SongDifficulties({
  mapset,
  onPick,
}: {
  mapset: Mapset;
  onPick: (name: string) => void;
}) {
  return (
    <div className="lazer-difficulties" aria-label="Difficulties">
      <p>{mapset.label}</p>
      {mapset.preview.difficulties.map((difficulty) => (
        <button
          key={difficulty.name}
          className={mapset.pickedName === difficulty.name ? 'is-active' : ''}
          style={{ '--difficulty-color': starColor(difficulty.stars) } as CSSProperties}
          aria-pressed={mapset.pickedName === difficulty.name}
          onClick={() => onPick(difficulty.name)}
        >
          <span>◉</span>
          <div>
            <strong>{difficulty.name}</strong>
            <small>★ {difficulty.stars.toFixed(2)}</small>
          </div>
          <span className="difficulty-chevron">›</span>
        </button>
      ))}
    </div>
  );
}
