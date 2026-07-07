import type { Grade } from './grade';
import { gradeColor, judgmentColors } from './grade';

interface Props {
  counts: { 300: number; 100: number; 50: number; 0: number };
  grade: Grade;
}

const SIZE = 250;
const R = 106;
const C = 2 * Math.PI * R;
const GAP = 6; // px of arc between segments

/**
 * osu!lazer-style results ring: one arc segment per judgment type,
 * length proportional to its share of the hit objects, grade in the middle.
 */
export function AccuracyRing({ counts, grade }: Props) {
  const total = counts[300] + counts[100] + counts[50] + counts[0];
  const order: (300 | 100 | 50 | 0)[] = [300, 100, 50, 0];
  const segments: { color: string; length: number; offset: number }[] = [];
  let used = 0;
  for (const j of order) {
    if (!counts[j] || !total) continue;
    const length = (counts[j] / total) * C;
    segments.push({ color: judgmentColors[j], length: Math.max(0, length - GAP), offset: used });
    used += length;
  }

  return (
    <div className="results-ring" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={10}
        />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${s.length} ${C - s.length}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
      </svg>
      <div
        className="results-grade count-pop"
        style={{ color: gradeColor(grade), textShadow: `0 0 56px ${gradeColor(grade)}66` }}
      >
        {grade}
      </div>
    </div>
  );
}
