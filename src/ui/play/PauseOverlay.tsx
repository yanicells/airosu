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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 10,
      }}
    >
      <h2>Paused</h2>
      <button className="btn btn--primary" style={{ fontSize: 16 }} onClick={onResume}>
        Resume
      </button>
      <button className="btn" onClick={onRestart}>
        Restart
      </button>
      <button className="btn" onClick={onQuit}>
        Quit to home
      </button>
    </div>
  );
}
