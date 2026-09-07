import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useSubmitScore } from '../../online/useSubmitScore';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { GameHeader } from '../shared/GameHeader';
import { PersonalScores } from '../shared/PersonalScores';
import { AccuracyRing } from './AccuracyRing';
import { JudgmentGrid } from './JudgmentGrid';
import { MapLeaderboard } from './MapLeaderboard';
import { SubmitPanel } from './SubmitPanel';
import { grade } from './grade';
import { useCountUp } from './useCountUp';
import './results.css';

export function ResultsScreen() {
  const { map, mapset, lastResult, setScreen } = useAppState();
  const me = useQuery(api.users.me);
  const submission = useSubmitScore();
  const bgUrl = useObjectUrl(map?.background);
  const shownScore = useCountUp(lastResult?.score ?? 0);
  const shownPp = useCountUp(Math.round(lastResult?.pp ?? 0), 1400);
  if (!lastResult || !map)
    return (
      <div className="screen-center">
        <p>No results yet.</p>
        <button className="btn" onClick={() => setScreen('songs')}>
          Song select
        </button>
      </div>
    );
  const stars = mapset?.preview.difficulties.find(
    (difficulty) => difficulty.name === map.meta.version,
  )?.stars;
  return (
    <div className="lazer-shell result-scene">
      {bgUrl && <div className="result-backdrop" style={{ backgroundImage: `url("${bgUrl}")` }} />}
      <GameHeader title="Results" />
      <main className="result-layout">
        <section className="lazer-result-card">
          <header className="result-player">
            {me?.image ? <img src={me.image} alt="" /> : <span className="result-avatar">◉</span>}
            <strong>{me?.name ?? 'Guest player'}</strong>
            <small>
              {lastResult.inputMode} · {lastResult.cursorAnchor} · {lastResult.forgiveness}×
              forgiveness
            </small>
          </header>
          <div className="result-song-title">
            <h1>{map.meta.title}</h1>
            <p>{map.meta.artist}</p>
          </div>
          <AccuracyRing counts={lastResult.counts} grade={grade(lastResult.accuracy)} />
          <div className="result-big-score">{shownScore.toLocaleString()}</div>
          <div className="result-difficulty">
            <span>★ {stars?.toFixed(2) ?? '—'}</span>
            <strong>{map.meta.version}</strong>
            <small>mapped by {map.meta.creator}</small>
          </div>
          <div className="result-metrics">
            <Stat label="Accuracy" value={`${(lastResult.accuracy * 100).toFixed(2)}%`} />
            <Stat label="Max combo" value={`${lastResult.maxCombo}×`} />
            <Stat label="Performance" value={`${shownPp} pp`} />
          </div>
          <JudgmentGrid counts={lastResult.counts} />
          <SubmitPanel submission={submission} />
        </section>
        <aside className="result-comparison">
          <PersonalScores
            osuText={map.rawOsu}
            mapId={submission.mapId}
            excludePlayId={lastResult.playId}
            cards
          />
          <MapLeaderboard mapId={submission.mapId} />
        </aside>
      </main>
      <footer className="result-footer">
        <button className="lazer-back" onClick={() => setScreen('songs')}>
          ‹ <span>Song select</span>
        </button>
        <button className="result-retry" onClick={() => setScreen('play')}>
          ↻ <span>Try again</span>
        </button>
        <button className="btn" onClick={() => setScreen('calibrate')}>
          Recalibrate
        </button>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
