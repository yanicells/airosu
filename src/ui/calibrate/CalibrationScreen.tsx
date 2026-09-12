import { useEffect } from 'react';
import { cameraBoxToDisplay, defaultBox, displayBoxToCamera } from '../../cv/calibration';
import { useAppState } from '../appState';
import { CameraPreview } from './CameraPreview';
import { CornerGuide } from './CornerGuide';
import { CursorDot } from './CursorDot';
import { AimArea } from './AimArea';
import { useCalibrationFlow } from './useCalibrationFlow';
import './calibration.css';

export function CalibrationScreen() {
  const { settings, calibration, setCalibration, setScreen } = useAppState();
  const flow = useCalibrationFlow(settings, calibration);
  const { step, session, box, countdown } = flow;
  useEffect(() => { session?.cursor.setSettings(settings); }, [session, settings]);
  useEffect(() => { session?.cursor.setCalibration(box); }, [session, box]);

  if (step === 'loading' || step === 'error' || !session) return (
    <div className="calibration-screen">
      <h2>{step === 'loading' ? 'Starting camera + hand tracker…' : 'Camera unavailable'}</h2>
      {step === 'error' && <><p>{flow.error ?? 'Camera permission is required to play.'}</p><button className="btn" onClick={flow.connect}>Retry</button></>}
      <button className="btn" onClick={() => setScreen('songs')}>Back to songs</button>
    </div>
  );

  const area = cameraBoxToDisplay(box, settings.sensitivity, settings.mirror);
  const editable = step === 'intro' || step === 'test';
  const anchor = settings.cursorAnchor === 'index' ? 'fingertip' : 'palm';
  const instruction = step === 'intro' ? `Choose a comfortable area for your ${anchor}. Smaller area means less hand movement.`
    : step === 'test' ? 'Move your hand inside the area. The game cursor should reach every edge of the preview.'
    : `Hold your ${anchor} on the ${step === 'corner1' ? 'top-left' : 'bottom-right'} target${countdown ? `… ${countdown}` : ', then press Ready'}.`;

  return (
    <div className="calibration-screen">
      <button className="btn calibration-back" onClick={() => setScreen('songs')}>‹ Songs</button>
      <div className="calibration-title">
        <h2>Your aim area</h2>
        <span className={`calibration-anchor calibration-anchor--${settings.cursorAnchor}`}>{anchor === 'palm' ? 'Palm control' : 'Fingertip control'}</span>
      </div>
      <p className="calibration-instruction">{instruction}</p>
      <CameraPreview video={session.video} mirror={settings.mirror}>
        <AimArea area={area} disabled={!editable} onChange={(next) => flow.setBox(displayBoxToCamera(next, settings.sensitivity, settings.mirror))} />
        <CornerGuide corner="top-left" anchor={settings.cursorAnchor} area={area} active={step === 'corner1'} />
        <CornerGuide corner="bottom-right" anchor={settings.cursorAnchor} area={area} active={step === 'corner2'} />
        <CursorDot session={session} settings={settings} testing={step === 'test'} />
      </CameraPreview>
      <div className="aim-area-info">
        <span>{Math.round(area.halfW * 200)}% wide · {Math.round(area.halfH * 200)}% tall</span>
        <button className="btn" disabled={!editable} onClick={() => flow.setBox(displayBoxToCamera(defaultBox(), settings.sensitivity, settings.mirror))}>Reset area</button>
      </div>
      <p id="aim-help">Drag inside to move; drag corners to resize. Arrow keys adjust focused control. Shift moves faster.</p>
      <div className="calibration-actions">
        {step === 'intro' && <>
          <button className="btn btn--primary" onClick={flow.startCorner1}>Check corners</button>
          <button className="btn" onClick={flow.testArea}>Use this area</button>
        </>}
        {step === 'corner2' && countdown === 0 && <button className="btn btn--primary" onClick={flow.startCorner2}>Ready — start</button>}
        {step === 'test' && <button className="btn btn--primary" onClick={() => { setCalibration(box); setScreen('play'); }}>Looks good — Continue</button>}
        {step !== 'intro' && <button className="btn" onClick={flow.editArea}>Adjust area</button>}
      </div>
      {flow.captureError && <p role="alert" className="calibration-capture-error">{flow.captureError}</p>}
      {session.cursor.usingCpuFallback() && <p className="calibration-warning">GPU acceleration unavailable — tracking uses CPU.</p>}
    </div>
  );
}
