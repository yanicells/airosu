import type { Id } from '../../../convex/_generated/dataModel';
import { gradeColor, type Grade } from '../results/grade';
import { usePersonalScores } from './usePersonalScores';

export function PersonalScores({ osuText, mapId, excludePlayId, cards = false }: {
  osuText?: string; mapId?: Id<'maps'>; excludePlayId?: string; cards?: boolean;
}) {
  const scores = usePersonalScores(osuText, mapId);
  const plays = scores.history?.recent.filter((play) => play.playId !== excludePlayId) ?? [];
  const best = scores.history?.best;
  return (
    <section className={`personal-scores${cards ? ' personal-scores--cards' : ''}`} aria-label="Your scores">
      <header className="scores-heading"><h2>{cards ? 'Previous plays' : 'Your scores'}</h2><span>THIS DIFFICULTY</span></header>
      {!osuText ? <p className="score-empty">Choose a difficulty to see your scores.</p>
        : !scores.isAuthenticated && !scores.loading ? <p className="score-empty">Sign in with osu! to see your saved plays.</p>
        : scores.loading ? <p className="score-empty" role="status">Loading your plays…</p>
        : scores.error ? <p className="score-empty">{scores.error} <button className="btn" onClick={scores.retry}>Retry</button></p>
        : <>
          {best && <div className="personal-best">
            <span className="score-grade" style={{ color: gradeColor(best.grade as Grade) }}>{best.grade}</span>
            <div><small>PERSONAL BEST · BY PP</small><strong>{best.score.toLocaleString()}</strong></div>
            <div className="best-figures"><strong>{best.pp.toFixed(1)} <small>pp</small></strong><span>{(best.accuracy * 100).toFixed(2)}% · {best.maxCombo}×</span></div>
          </div>}
          {plays.length === 0 ? <p className="score-empty">{excludePlayId ? 'No earlier saved plays. Make this the first of many.' : 'No saved plays yet. Set your first score!'}</p>
            : <div className="score-history">{plays.map((play) => <article className="history-play" key={play._id}>
              <span className="score-grade" style={{ color: gradeColor(play.grade as Grade) }}>{play.grade}</span>
              <div className="history-main"><strong>{play.score.toLocaleString()}</strong><small>{new Date(play._creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small></div>
              <div className="history-numbers"><strong>{play.pp.toFixed(1)} pp</strong><small>{(play.accuracy * 100).toFixed(2)}% · {play.maxCombo}×</small></div>
              <div className="history-mode">{play.inputMode} · {play.cursorAnchor} · {play.forgiveness}×</div>
            </article>)}</div>}
        </>}
    </section>
  );
}
