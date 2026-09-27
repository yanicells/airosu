import { Link } from 'react-router';
import { gradeColor, judgmentLabels, type Grade } from './grade';

export interface BoardScore {
  scoreId: string;
  osuId?: number;
  name?: string;
  image?: string;
  score: number;
  pp: number;
  accuracy: number;
  maxCombo: number;
  grade: string;
  counts: { 300: number; 100: number; 50: number; 0: number };
}

const order: (300 | 100 | 50 | 0)[] = [300, 100, 50, 0];

/** A compact leaderboard card beside the result, like lazer's contracted score panels. */
export function ScoreCard({ row, rank }: { row: BoardScore; rank: number }) {
  const name = row.name ?? 'Unknown player';
  return (
    <article className="score-card">
      <span className="score-card__rank">#{rank}</span>
      <div className="score-card__top">
        {row.image ? (
          <img src={row.image} alt="" loading="lazy" />
        ) : (
          <span className="score-card__avatar" aria-hidden="true" />
        )}
        {row.osuId != null ? <Link to={`/u/${row.osuId}`}>{name}</Link> : <strong>{name}</strong>}
        <dl>
          {order.map((j) => (
            <div key={j}>
              <dt>{judgmentLabels[j]}</dt>
              <dd>{row.counts[j]}</dd>
            </div>
          ))}
          <div className="score-card__spacer">
            <dt>Max Combo</dt>
            <dd>x{row.maxCombo}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{(row.accuracy * 100).toFixed(2)}%</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{Math.round(row.pp)}</dd>
          </div>
        </dl>
      </div>
      <strong className="score-card__score">{row.score.toLocaleString()}</strong>
      <span className="grade-pill" style={{ background: gradeColor(row.grade as Grade) }}>
        {row.grade}
      </span>
    </article>
  );
}
