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
      <button style={{ fontSize: 18, padding: '10px 40px' }} onClick={onResume}>
        Resume
      </button>
      <button onClick={onRestart}>Restart</button>
      <button onClick={onQuit}>Quit to home</button>
    </div>
  );
}
