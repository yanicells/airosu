import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { adjustAimArea } from '../../cv/calibration';
import type { AimAreaHandle, CalibrationBox } from '../../cv/calibration';

const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export function AimArea({ area, disabled, onChange }: {
  area: CalibrationBox;
  disabled: boolean;
  onChange: (area: CalibrationBox) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; width: number; height: number; area: CalibrationBox; handle: AimAreaHandle } | null>(null);
  const start = (event: PointerEvent<HTMLButtonElement>, handle: AimAreaHandle) => {
    if (event.button !== 0) return;
    const bounds = root.current!.getBoundingClientRect();
    drag.current = { x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, area, handle };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.currentTarget.focus();
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    onChange(adjustAimArea(d.area, d.handle, (event.clientX - d.x) / d.width, (event.clientY - d.y) / d.height));
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>, handle: AimAreaHandle) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!delta[event.key]) return;
    event.preventDefault();
    onChange(adjustAimArea(area, handle, ...delta[event.key]));
  };
  const interaction = (handle: AimAreaHandle) => ({
    disabled,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => start(event, handle),
    onPointerMove: move,
    onLostPointerCapture: () => { drag.current = null; },
    onPointerUp: () => { drag.current = null; },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => key(event, handle),
  });
  return (
    <div ref={root} className="aim-editor">
      <div className="aim-area" style={{ left: `${(area.cx - area.halfW) * 100}%`, top: `${(area.cy - area.halfH) * 100}%`, width: `${area.halfW * 200}%`, height: `${area.halfH * 200}%` }}>
        <button type="button" className="aim-area__move" aria-label="Move aim area" aria-describedby="aim-help" {...interaction('move')}>
          <span>Aim area</span>
        </button>
        {handles.map((handle) => (
          <button key={handle} type="button" className={`aim-area__handle aim-area__handle--${handle}`} aria-label={`Resize ${handle} corner`} aria-describedby="aim-help" {...interaction(handle)} />
        ))}
      </div>
    </div>
  );
}
