import type { CursorAnchor } from '../../cv/cursorPoint';
import type { CalibrationBox } from '../../cv/calibration';

export function CornerGuide({ corner, anchor, area, active }: {
  corner: 'top-left' | 'bottom-right';
  anchor: CursorAnchor;
  area: CalibrationBox;
  active: boolean;
}) {
  const sign = corner === 'top-left' ? -1 : 1;
  return (
    <div className={`corner-target corner-target--${anchor}${active ? ' is-active' : ' is-idle'}`}
      style={{ left: `${(area.cx + sign * area.halfW) * 100}%`, top: `${(area.cy + sign * area.halfH) * 100}%`, pointerEvents: 'none' }}>
      <div className="corner-target__dot" />
    </div>
  );
}
