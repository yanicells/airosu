import { gradeColor, type Grade } from '../results/grade';
import { flagEmoji } from '../shared/flag';
import { timeAgo } from '../shared/timeAgo';

export interface RankedScore {
  key: string;
  rank?: number;
  name: string;
  image?: string;
  countryCode?: string;
  playedAt: number;
  pp: number;
  maxCombo: number;
  accuracy: number;
  score: number;
  grade: string;
  mine?: boolean;
}

/** One lazer leaderboard row: rank, avatar, player, pp/combo/accuracy, score, grade tab. */
export function ScoreRow({ row }: { row: RankedScore }) {
  return (
    <article className={`score-row${row.mine ? ' is-mine' : ''}`}>
      <span className="score-row__rank">{row.rank ? `#${row.rank}` : '—'}</span>
      {row.image ? (
        <img className="score-row__avatar" src={row.image} alt="" loading="lazy" />
      ) : (
        <span className="score-row__avatar" aria-hidden="true" />
      )}
      <div className="score-row__player">
        <strong>{row.name}</strong>
        <small>
          {row.countryCode && <span>{flagEmoji(row.countryCode)}</span>}
          {timeAgo(row.playedAt)}
        </small>
      </div>
      <dl className="score-row__stats">
        <div>
          <dt>pp</dt>
          <dd>{Math.round(row.pp)}</dd>
        </div>
        <div>
          <dt>combo</dt>
          <dd>{row.maxCombo}x</dd>
        </div>
        <div>
          <dt>accuracy</dt>
          <dd>{(row.accuracy * 100).toFixed(2)}%</dd>
        </div>
      </dl>
      <span className="score-row__score">{row.score.toLocaleString()}</span>
      <span className="score-row__grade" style={{ background: gradeColor(row.grade as Grade) }}>
        {row.grade}
      </span>
    </article>
  );
}
