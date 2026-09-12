import { useEffect, useRef } from 'react';
import { PLAYFIELD } from '../../beatmap/model';
import type { CvSession } from '../../cv/cvSession';
import type { Settings } from '../appState';

/** Test mode uses the very same filtered sample as the game. */
export function CursorDot({ session, settings, testing }: {
  session: CvSession;
  settings: Settings;
  testing: boolean;
}) {
  const dotRef = useRef<HTMLDivElement>(null);
  useEffect(() => session.cursor.onSample((sample) => {
    const dot = dotRef.current;
    if (!dot) return;
    const point = testing ? sample.playfield : sample.camera;
    dot.style.opacity = point ? '1' : '0.3';
    if (!point) return;
    const x = testing ? point.x / PLAYFIELD.w : settings.mirror ? 1 - point.x : point.x;
    const y = testing ? point.y / PLAYFIELD.h : point.y;
    dot.style.left = `${x * 100}%`;
    dot.style.top = `${y * 100}%`;
  }), [session, settings.mirror, testing]);
  return <div ref={dotRef} className={`calibration-cursor calibration-cursor--${settings.cursorAnchor}`} style={{ position: 'absolute', pointerEvents: 'none' }} />;
}
