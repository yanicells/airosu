export function PauseOverlay({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-menu panel fade-up">
        <header className="pause-menu__header">
          <span className="eyebrow">Game paused</span>
          <h2 id="pause-title">Take a breath.</h2>
          <p>Tracking and audio are frozen until you return.</p>
        </header>
        <div className="pause-menu__actions">
          <button
            className="pause-action pause-action--primary"
            autoFocus
            onClick={onResume}
          >
            <span>Resume</span>
            <small>Return to the beatmap</small>
          </button>
          <button className="pause-action" onClick={onRestart}>
            <span>Restart</span>
            <small>Play this map from the beginning</small>
          </button>
          <button className="pause-action pause-action--quiet" onClick={onQuit}>
            <span>Quit to song select</span>
            <small>Leave this run</small>
          </button>
        </div>
      </div>
    </div>
  );
}
