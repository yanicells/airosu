import type { CSSProperties } from 'react';
import type { LoadedBeatmap } from '../../beatmap/model';
import type { LastResult } from '../appState';
import { starColor } from '../home/starColor';
import { AccuracyRing } from './AccuracyRing';
import { CountUp } from './CountUp';
import { JudgmentGrid } from './JudgmentGrid';
import { grade } from './grade';

/** The centred, expanded score panel for the play that just finished. */
export function ResultCard({
  result,
  map,
  stars,
  player,
}: {
  result: LastResult;
  map: LoadedBeatmap;
  stars?: number;
  player: { name: string; image?: string };
}) {
  return (
    <article className="result-card" aria-label="Your result">
      <header className="result-card__player">
        {player.image ? (
          <img src={player.image} alt="" />
        ) : (
          <span className="result-card__avatar" aria-hidden="true" />
        )}
        <strong>{player.name}</strong>
      </header>
      <div className="result-card__body">
        <h1>{map.meta.title}</h1>
        <p className="result-card__artist">{map.meta.artist}</p>
        <AccuracyRing accuracy={result.accuracy} grade={grade(result.accuracy)} />
        <div className="result-card__score">
          <CountUp value={result.score} />
        </div>
        <span
          className="star-pill"
          style={{ '--star-color': stars === undefined ? '#aaa' : starColor(stars) } as CSSProperties}
        >
          ★ {stars?.toFixed(2) ?? '—'}
        </span>
        <strong className="result-card__version">{map.meta.version}</strong>
        <small className="result-card__mapper">
          mapped by <strong>{map.meta.creator}</strong>
        </small>
        <dl className="result-stats">
          <div>
            <dt>Accuracy</dt>
            <dd>{(result.accuracy * 100).toFixed(2)}%</dd>
          </div>
          <div>
            <dt>Max Combo</dt>
            <dd>
              {result.maxCombo}
              <small>x</small>
            </dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>
              <CountUp value={Math.round(result.pp)} durationMs={1400} />
            </dd>
          </div>
        </dl>
        <JudgmentGrid counts={result.counts} />
        <p className="result-card__played">
          {result.inputMode} · {result.cursorAnchor} cursor · {result.forgiveness}× forgiveness
        </p>
      </div>
    </article>
  );
}
