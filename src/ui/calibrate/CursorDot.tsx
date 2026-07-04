import { useEffect, useRef } from 'react';
import { PLAYFIELD } from '../../beatmap/model';
import type { CalibrationBox } from '../../cv/calibration';
import { mapToPlayfield } from '../../cv/calibration';
import type { CvSession } from '../../cv/cvSession';
import type { Settings } from '../appState';

/** Live cursor dot overlay, positioned via the given calibration box. */
export function CursorDot({
  session,
  box,
  settings,
}: {
  session: CvSession;
  box: CalibrationBox;
  settings: Settings;
}) {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return session.cursor.onSample((s) => {
      const dot = dotRef.current;
      if (!dot) return;
      if (!s.camera) {
        dot.style.opacity = '0.3';
        return;
      }
      const p = mapToPlayfield(s.camera, box, settings.sensitivity, settings.mirror);
      dot.style.opacity = '1';
      dot.style.left = `${(p.x / PLAYFIELD.w) * 100}%`;
      dot.style.top = `${(p.y / PLAYFIELD.h) * 100}%`;
    });
  }, [session, box, settings]);

  return (
    <div
      ref={dotRef}
      style={{
        position: 'absolute',
        width: 24,
        height: 24,
        marginLeft: -12,
        marginTop: -12,
        borderRadius: '50%',
        background: '#ff66aa',
        border: '3px solid #fff',
        pointerEvents: 'none',
        transition: 'opacity 0.2s',
      }}
    />
  );
}
