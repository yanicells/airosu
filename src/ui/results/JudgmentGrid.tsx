import { judgmentColors, judgmentLabels } from './grade';

interface Props {
  counts: { 300: number; 100: number; 50: number; 0: number };
}

const order: (300 | 100 | 50 | 0)[] = [300, 100, 50, 0];

export function JudgmentGrid({ counts }: Props) {
  return (
    <div className="results-judgments">
      {order.map((j) => (
        <div key={j} className="results-judgment">
          <span className="eyebrow" style={{ color: judgmentColors[j] }}>
            {judgmentLabels[j]}
          </span>
          <span className="results-judgment__count">{counts[j]}</span>
        </div>
      ))}
    </div>
  );
}
