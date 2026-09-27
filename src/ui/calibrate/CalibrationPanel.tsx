import type { CalibrationBox } from '../../cv/calibration';
import { useAppState } from '../appState';
import type { useCalibrationFlow } from './useCalibrationFlow';

const STEPS = ['Choose your area', 'Check the corners', 'Test and play'];

/** The settings-style side panel that walks the player through calibration. */
export function CalibrationPanel({
  flow,
  area,
  editable,
  onResetArea,
}: {
  flow: ReturnType<typeof useCalibrationFlow>;
  area: CalibrationBox;
  editable: boolean;
  onResetArea: () => void;
}) {
  const { settings, setCalibration, setScreen } = useAppState();
  const { step, session, countdown } = flow;
  const anchor = settings.cursorAnchor === 'index' ? 'fingertip' : 'palm';
  const current = step === 'test' ? 2 : step === 'corner1' || step === 'corner2' ? 1 : 0;
  const instruction =
    step === 'intro'
      ? `Choose a comfortable area for your ${anchor}. Smaller area means less hand movement.`
      : step === 'test'
        ? 'Move your hand inside the area. The game cursor should reach every edge of the preview.'
        : `Hold your ${anchor} on the ${step === 'corner1' ? 'top-left' : 'bottom-right'} target${countdown ? `… ${countdown}` : ', then press Ready'}.`;

  return (
    <aside className="lz-panel calibration-panel">
      <header className="lz-panel__title">
        <h1>calibration</h1>
        <p>fit the playfield to your hand</p>
      </header>

      {step === 'loading' || step === 'error' || !session ? (
        <section>
          <h2>{step === 'loading' ? 'Starting camera…' : 'Camera unavailable'}</h2>
          {step === 'error' && (
            <>
              <p className="calibration-instruction">
                {flow.error ?? 'Camera permission is required to play.'}
              </p>
              <button className="lz-button" onClick={flow.connect}>
                Retry
              </button>
            </>
          )}
        </section>
      ) : (
        <section>
          <div className="calibration-heading">
            <h2>Your aim area</h2>
            <span className={`calibration-anchor calibration-anchor--${settings.cursorAnchor}`}>
              {anchor === 'palm' ? 'Palm control' : 'Fingertip control'}
            </span>
          </div>
          <ol className="calibration-steps">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={index === current ? 'is-active' : index < current ? 'is-done' : ''}
              >
                {label}
              </li>
            ))}
          </ol>
          <p className="calibration-instruction">{instruction}</p>
          <div className="aim-area-info">
            <span>
              {Math.round(area.halfW * 200)}% wide · {Math.round(area.halfH * 200)}% tall
            </span>
            <button className="lz-link" disabled={!editable} onClick={onResetArea}>
              Reset area
            </button>
          </div>
          <p id="aim-help" className="setting-hint">
            Drag inside to move; drag corners to resize. Arrow keys adjust the focused control. Shift
            moves faster.
          </p>
          <div className="calibration-actions">
            {step === 'intro' && (
              <>
                <button className="lz-button" onClick={flow.testArea}>
                  Use this area
                </button>
                <button className="lz-button lz-button--yellow" onClick={flow.startCorner1}>
                  Check corners
                </button>
              </>
            )}
            {step === 'corner2' && countdown === 0 && (
              <button className="lz-button" onClick={flow.startCorner2}>
                Ready — start
              </button>
            )}
            {step === 'test' && (
              <button
                className="lz-button"
                onClick={() => {
                  setCalibration(flow.box);
                  setScreen('play');
                }}
              >
                Looks good — Continue
              </button>
            )}
            {step !== 'intro' && (
              <button className="lz-button lz-button--yellow" onClick={flow.editArea}>
                Adjust area
              </button>
            )}
          </div>
          {flow.captureError && (
            <p role="alert" className="calibration-capture-error">
              {flow.captureError}
            </p>
          )}
          {session.cursor.usingCpuFallback() && (
            <p className="calibration-warning">GPU acceleration unavailable — tracking uses CPU.</p>
          )}
        </section>
      )}
      <button className="lz-button lz-button--ghost calibration-back" onClick={() => setScreen('songs')}>
        Back to song select
      </button>
    </aside>
  );
}
