import { prepareMapPerformance } from '../../beatmap/mapWorker';
import { useEffect } from 'react';
import { cameraBoxToDisplay, defaultBox, displayBoxToCamera } from '../../cv/calibration';
import { useAppState } from '../appState';
import { GameHeader } from '../shared/GameHeader';
import { CameraPreview } from './CameraPreview';
import { CornerGuide } from './CornerGuide';
import { CursorDot } from './CursorDot';
import { AimArea } from './AimArea';
import { CalibrationPanel } from './CalibrationPanel';
import { useCalibrationFlow } from './useCalibrationFlow';
import '../shared/lazerPanel.css';
import './calibration.css';

/** Aim-area calibration, laid out like lazer's settings: controls on the left, camera on the right. */
export function CalibrationScreen() {
  const { map, settings, calibration, setScreen } = useAppState();
  useEffect(() => {
    if (map) void prepareMapPerformance(map).catch(() => {});
  }, [map]);
  const flow = useCalibrationFlow(settings, calibration);
  const { step, session, box } = flow;
  useEffect(() => {
    session?.cursor.setSettings(settings);
  }, [session, settings]);
  useEffect(() => {
    session?.cursor.setCalibration(box);
  }, [session, box]);

  const ready = step !== 'loading' && step !== 'error' && session;
  const area = cameraBoxToDisplay(box, settings.sensitivity, settings.mirror);
  const editable = step === 'intro' || step === 'test';

  return (
    <div
      className="lazer-shell calibration-scene"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.defaultPrevented) setScreen('songs');
      }}
    >
      <GameHeader />
      <div className="calibration-body">
        <CalibrationPanel
          flow={flow}
          area={area}
          editable={editable}
          onResetArea={() =>
            flow.setBox(displayBoxToCamera(defaultBox(), settings.sensitivity, settings.mirror))
          }
        />
        <main className="calibration-stage">
          {ready ? (
            <CameraPreview video={session.video} mirror={settings.mirror}>
              <AimArea
                area={area}
                disabled={!editable}
                onChange={(next) =>
                  flow.setBox(displayBoxToCamera(next, settings.sensitivity, settings.mirror))
                }
              />
              <CornerGuide
                corner="top-left"
                anchor={settings.cursorAnchor}
                area={area}
                active={step === 'corner1'}
              />
              <CornerGuide
                corner="bottom-right"
                anchor={settings.cursorAnchor}
                area={area}
                active={step === 'corner2'}
              />
              <CursorDot session={session} settings={settings} testing={step === 'test'} />
            </CameraPreview>
          ) : (
            <p className="calibration-waiting" role="status">
              {step === 'loading' ? 'Starting camera + hand tracker…' : 'Camera unavailable'}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
