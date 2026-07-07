import { useAppState } from '../appState';
import { useObjectUrl } from '../useObjectUrl';
import { AccuracyRing } from './AccuracyRing';
import { JudgmentGrid } from './JudgmentGrid';
import { grade } from './grade';
import { useCountUp } from './useCountUp';

export function ResultsScreen() {
  const { map, mapset, lastResult, setScreen, setMap } = useAppState();

  // created in an effect so StrictMode's unmount/remount recreates a valid URL
  const bgUrl = useObjectUrl(map?.background);

  const shownScore = useCountUp(lastResult?.score ?? 0);
  const shownPp = useCountUp(Math.round(lastResult?.pp ?? 0), 1400);

  if (!lastResult || !map) {
    return (
      <div className="screen-center">
        <p>No results yet — play a map first.</p>
        <button className="btn" onClick={() => setScreen('home')}>
          Back to song select
        </button>
      </div>
    );
  }

  const g = grade(lastResult.accuracy);
  const stars = mapset?.preview.difficulties.find((d) => d.name === map.meta.version)?.stars;

  return (
    <div className="screen-center">
      {bgUrl && <div className="bg-blur" style={{ backgroundImage: `url(${bgUrl})` }} />}
      <div className="results-panel panel fade-up">
        <header className="results-header">
          <div className="results-title">{map.meta.title}</div>
          <div className="results-sub">{map.meta.artist}</div>
          <div className="results-diff">
            <span className="results-diff__pill">
              {stars !== undefined && <>★ {stars.toFixed(2)} · </>}
              {map.meta.version}
            </span>
            <span className="results-sub"> mapped by {map.meta.creator}</span>
          </div>
        </header>

        <AccuracyRing counts={lastResult.counts} grade={g} />

        <div className="results-score">{shownScore.toLocaleString()}</div>

        <div className="results-stats">
          <Stat label="Accuracy" value={`${(lastResult.accuracy * 100).toFixed(2)}%`} />
          <Stat label="Max combo" value={`${lastResult.maxCombo}x`} />
          <Stat label="pp" value={String(shownPp)} accent />
        </div>

        <JudgmentGrid counts={lastResult.counts} />

        <div className="results-actions">
          <button className="btn btn--primary" onClick={() => setScreen('play')}>
            Retry
          </button>
          <button
            className="btn"
            onClick={() => {
              setMap(undefined);
              setScreen('home');
            }}
          >
            Change map
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="results-stat">
      <span className="eyebrow">{label}</span>
      <span
        className="results-stat__value"
        style={accent ? { color: 'var(--pink)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
