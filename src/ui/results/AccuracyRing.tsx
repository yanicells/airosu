import type { CSSProperties } from 'react';
import type { Grade } from './grade';
import { gradeColor } from './grade';

const SIZE = 300;
const OUTER = 128;
const INNER = 106;
const C_OUTER = 2 * Math.PI * OUTER;
const C_INNER = 2 * Math.PI * INNER;
const GAP = 0.006;

/** Accuracy bands and where each grade badge sits (the band midpoint), as fractions of the circle. */
const BANDS: { grade: Grade; from: number; to: number }[] = [
  { grade: 'D', from: 0, to: 0.7 },
  { grade: 'C', from: 0.7, to: 0.8 },
  { grade: 'B', from: 0.8, to: 0.9 },
  { grade: 'A', from: 0.9, to: 0.95 },
  { grade: 'S', from: 0.95, to: 1 },
];

/**
 * osu!lazer accuracy circle: a thick cyan→green arc filled to the play's accuracy,
 * an inner ring split into grade bands, grade badges around it, and the grade in the middle.
 */
export function AccuracyRing({ accuracy, grade }: { accuracy: number; grade: Grade }) {
  const filled = Math.max(0, Math.min(1, accuracy)) * C_OUTER;
  return (
    <div className="accuracy-ring">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <defs>
          <linearGradient id="accuracy-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7cf6ff" />
            <stop offset="1" stopColor="#baffa9" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={OUTER} className="accuracy-ring__track" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={OUTER}
            className="accuracy-ring__fill"
            strokeDasharray={`${filled} ${C_OUTER}`}
            style={{ '--len': filled } as CSSProperties}
          />
          {BANDS.map((band) => {
            const length = (band.to - band.from - GAP) * C_INNER;
            return (
              <circle
                key={band.grade}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={INNER}
                className="accuracy-ring__band"
                stroke={gradeColor(band.grade)}
                strokeDasharray={`${length} ${C_INNER}`}
                strokeDashoffset={-(band.from + GAP / 2) * C_INNER}
              />
            );
          })}
        </g>
      </svg>
      {BANDS.map((band) => {
        const angle = ((band.from + band.to) / 2) * 2 * Math.PI;
        return (
          <span
            key={band.grade}
            className="grade-pill accuracy-ring__badge"
            style={{
              background: gradeColor(band.grade),
              left: `${50 + Math.sin(angle) * 57}%`,
              top: `${50 - Math.cos(angle) * 57}%`,
            }}
          >
            {band.grade}
          </span>
        );
      })}
      <div
        className="accuracy-ring__grade count-pop"
        style={{ '--grade-color': gradeColor(grade) } as CSSProperties}
      >
        {grade}
      </div>
    </div>
  );
}
