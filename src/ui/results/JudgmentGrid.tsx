import { judgmentColors, judgmentLabels } from './grade';

const order: (300 | 100 | 50 | 0)[] = [300, 100, 50, 0];

/** Lazer's judgement row: coloured uppercase headers over each count. */
export function JudgmentGrid({ counts }: { counts: { 300: number; 100: number; 50: number; 0: number } }) {
  return (
    <dl className="result-stats result-stats--judgements">
      {order.map((j) => (
        <div key={j}>
          <dt style={{ color: judgmentColors[j] }}>{judgmentLabels[j]}</dt>
          <dd>{counts[j]}</dd>
        </div>
      ))}
    </dl>
  );
}
