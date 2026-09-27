import type { CSSProperties } from 'react';
import { TargetIcon } from '../shared/icons';
import { starColor } from './starColor';

/** Difficulty rows that slide out under the selected set, tinted by star rating. */
export function SongDifficulties({
  difficulties,
  picked,
  creator,
  onPick,
}: {
  difficulties: { name: string; stars?: number }[];
  picked?: string;
  creator?: string;
  onPick: (name: string) => void;
}) {
  return (
    <div className="difficulty-rows" aria-label="Difficulties">
      {difficulties.map(({ name, stars }) => {
        const active = picked === name;
        const color = stars === undefined ? '#8a8f99' : starColor(stars);
        return (
          <button
            key={name}
            className={`difficulty-row${active ? ' is-active' : ''}`}
            style={{ '--difficulty-color': color } as CSSProperties}
            aria-pressed={active}
            onClick={() => onPick(name)}
          >
            <TargetIcon size={24} />
            <span className="difficulty-row__copy">
              <span>
                <strong>{name}</strong>
                {creator && active && (
                  <>
                    {' '}
                    mapped by <strong>{creator}</strong>
                  </>
                )}
              </span>
              <span className="difficulty-row__stars">
                <span className="star-pill" style={{ '--star-color': color } as CSSProperties}>
                  ★ {stars?.toFixed(2) ?? '—'}
                </span>
                <span aria-hidden="true">{'★'.repeat(Math.min(10, Math.round(stars ?? 0)))}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
