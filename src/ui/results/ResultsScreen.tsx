import { useLayoutEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useSubmitScore } from '../../online/useSubmitScore';
import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { GameHeader } from '../shared/GameHeader';
import { ChevronLeftIcon, RetryIcon, TargetIcon } from '../shared/icons';
import { ResultCard } from './ResultCard';
import { ScoreCard } from './ScoreCard';
import { SubmitPanel } from './SubmitPanel';
import { placeCurrent } from './placement';
import './results.css';

/** osu!lazer results: the play's expanded card centred in a strip of the map's other top plays. */
export function ResultsScreen() {
  const { map, mapset, lastResult, setScreen } = useAppState();
  const me = useQuery(api.users.me);
  const submission = useSubmitScore();
  const board = useQuery(
    api.scores.mapLeaderboard,
    submission.mapId ? { mapId: submission.mapId } : 'skip',
  );
  const bgUrl = useObjectUrl(map?.background);
  const stripRef = useRef<HTMLDivElement>(null);
  // The server's pp is authoritative; the local estimate shows until the submission lands.
  const pp = submission.result?.pp ?? lastResult?.pp ?? 0;
  const { before, after } = placeCurrent(
    board ?? [],
    pp,
    submission.result?.isBest ? me?.osuId : undefined,
  );

  // Keep the current play centred whenever cards load around it.
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const card = strip?.querySelector<HTMLElement>('.result-card');
    if (!strip || !card) return;
    strip.scrollLeft = card.offsetLeft + card.offsetWidth / 2 - strip.clientWidth / 2;
  }, [before.length, after.length]);

  if (!lastResult || !map)
    return (
      <div className="screen-center">
        <p>No results yet.</p>
        <button className="btn" onClick={() => setScreen('songs')}>
          Song select
        </button>
      </div>
    );
  const stars = mapset?.preview.difficulties.find((d) => d.name === map.meta.version)?.stars;
  return (
    <div className="lazer-shell result-scene">
      {bgUrl && <div className="result-backdrop" style={{ backgroundImage: `url("${bgUrl}")` }} />}
      <GameHeader />
      <main
        ref={stripRef}
        className="result-strip"
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
            event.currentTarget.scrollLeft += event.deltaY;
        }}
      >
        {before.map((row, index) => (
          <ScoreCard key={row.scoreId} row={row} rank={index + 1} />
        ))}
        <ResultCard
          result={{ ...lastResult, pp }}
          map={map}
          stars={stars}
          player={{ name: me?.name ?? 'Guest', image: me?.image }}
        />
        {after.map((row, index) => (
          <ScoreCard key={row.scoreId} row={row} rank={before.length + index + 2} />
        ))}
      </main>
      <footer className="lazer-footer result-footer">
        <button className="lazer-back" onClick={() => setScreen('songs')}>
          <ChevronLeftIcon size={22} />
          <span>Back</span>
        </button>
        <button className="result-retry" onClick={() => setScreen('play')} aria-label="Retry">
          <RetryIcon size={24} />
        </button>
        <button
          className="result-recalibrate"
          onClick={() => setScreen('calibrate')}
          aria-label="Recalibrate"
          title="Recalibrate"
        >
          <TargetIcon size={22} />
        </button>
        <SubmitPanel submission={submission} />
      </footer>
    </div>
  );
}
