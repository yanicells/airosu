import { useAppState } from '../appState';
import { CameraPreview } from './CameraPreview';
import { CornerGuide } from './CornerGuide';
import { CursorDot } from './CursorDot';
import { useCalibrationFlow } from './useCalibrationFlow';

const panel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  padding: 32,
  height: '100%',
  justifyContent: 'center',
};

export function CalibrationScreen() {
  const { settings, setCalibration, setScreen } = useAppState();
  const { step, error, session, countdown, box, connect, startCorner1, startCorner2, skip } =
    useCalibrationFlow();

  if (step === 'loading') return <div style={panel}>Starting camera + hand tracker…</div>;

  if (step === 'error' || !session)
    return (
      <div style={panel}>
        <h2>Camera unavailable</h2>
        <p style={{ opacity: 0.7 }}>{error ?? 'Camera permission is required to play.'}</p>
        <button className="btn" onClick={connect}>
          Retry
        </button>
        <button className="btn" onClick={() => setScreen('home')}>
          Back
        </button>
      </div>
    );

  const instruction =
    step === 'intro'
      ? 'We will map a small hand-movement box to the whole playfield.'
      : step === 'corner1'
        ? `Hold your hand on the target… ${countdown}`
        : step === 'corner2'
          ? `Now the opposite corner… ${countdown}`
          : 'Move your hand — the dot should reach every edge comfortably.';

  return (
    <div style={panel}>
      <h2 style={{ margin: 0 }}>Calibration</h2>
      <p style={{ margin: 0 }}>{instruction}</p>
      <CameraPreview video={session.video} mirror={settings.mirror}>
        {step === 'corner1' && <CornerGuide corner="top-left" />}
        {step === 'corner2' && <CornerGuide corner="bottom-right" />}
        {step === 'test' && <CursorDot session={session} box={box} settings={settings} />}
      </CameraPreview>
      <div style={{ display: 'flex', gap: 12 }}>
        {step === 'intro' && (
          <>
            <button className="btn btn--primary" style={{ fontSize: 16 }} onClick={startCorner1}>
              Start calibration
            </button>
            <button className="btn" onClick={skip}>
              Skip (default box)
            </button>
          </>
        )}
        {step === 'corner2' && countdown === 0 && (
          <button className="btn btn--primary" style={{ fontSize: 16 }} onClick={startCorner2}>
            Ready — start
          </button>
        )}
        {step === 'test' && (
          <>
            <button
              className="btn btn--primary"
              style={{ fontSize: 16 }}
              onClick={() => {
                setCalibration(box);
                setScreen('play');
              }}
            >
              Looks good — Continue
            </button>
            <button className="btn" onClick={startCorner1}>
              Redo
            </button>
          </>
        )}
      </div>
      {step === 'corner2' && countdown > 0 && <p style={{ opacity: 0.6 }}>Collecting…</p>}
      {session.cursor.usingCpuFallback() && (
        <p style={{ color: '#ffaa55', fontSize: 13 }}>
          GPU acceleration unavailable — tracking runs on CPU and may feel laggier.
        </p>
      )}
      <p style={{ opacity: 0.5, fontSize: 13 }}>Tip: press R in game to recenter on your hand.</p>
    </div>
  );
}
