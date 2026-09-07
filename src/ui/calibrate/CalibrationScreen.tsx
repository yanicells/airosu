import { useEffect } from 'react';
import { useAppState } from '../appState';
import { CameraPreview } from './CameraPreview';
import { CornerGuide } from './CornerGuide';
import { CursorDot } from './CursorDot';
import { useCalibrationFlow } from './useCalibrationFlow';

const panel: React.CSSProperties = {
  position: 'relative',
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
  const {
    step,
    error,
    captureError,
    session,
    countdown,
    box,
    connect,
    startCorner1,
    startCorner2,
    skip,
  } = useCalibrationFlow();

  useEffect(() => {
    session?.cursor.setSettings(settings);
  }, [session, settings]);

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

  const isIndex = settings.cursorAnchor === 'index';
  const instruction = isIndex
    ? step === 'intro'
      ? 'Point with the tip of your index finger. Keep it extended while you calibrate.'
      : step === 'corner1'
        ? `Place your fingertip on the blue target and hold… ${countdown}`
        : step === 'corner2'
          ? `Point the same fingertip at the opposite blue target… ${countdown}`
          : 'Trace with your fingertip — the crosshair should reach every edge comfortably.'
    : step === 'intro'
      ? 'Aim with the center of an open palm. Keep your palm facing the camera.'
      : step === 'corner1'
        ? `Center your palm inside the pink ring and hold… ${countdown}`
        : step === 'corner2'
          ? `Move the center of your palm into the opposite pink ring… ${countdown}`
          : 'Move your open palm — the round cursor should reach every edge comfortably.';

  return (
    <div style={panel}>
      <button
        className="btn btn--back"
        style={{ position: 'absolute', top: 16, left: 16 }}
        onClick={() => setScreen('home')}
      >
        ‹ Songs
      </button>
      <div className="calibration-title">
        <h2>Calibration</h2>
        <span className={`calibration-anchor calibration-anchor--${settings.cursorAnchor}`}>
          {isIndex ? 'Fingertip control' : 'Palm control'}
        </span>
      </div>
      <p className="calibration-instruction">{instruction}</p>
      <CameraPreview video={session.video} mirror={settings.mirror}>
        {step === 'corner1' && (
          <CornerGuide corner="top-left" anchor={settings.cursorAnchor} />
        )}
        {step === 'corner2' && (
          <CornerGuide corner="bottom-right" anchor={settings.cursorAnchor} />
        )}
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
      {captureError && <p className="calibration-capture-error">{captureError}</p>}
      {step === 'corner2' && countdown > 0 && <p style={{ opacity: 0.6 }}>Collecting…</p>}
      {session.cursor.usingCpuFallback() && (
        <p style={{ color: '#ffaa55', fontSize: 13 }}>
          GPU acceleration unavailable — tracking runs on CPU and may feel laggier.
        </p>
      )}
    </div>
  );
}
