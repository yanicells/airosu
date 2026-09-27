import { useEffect, useState } from 'react';

/** Animates 0 → target with an ease-out curve; jumps straight to target under reduced motion. */
export function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/**
 * Counting number as its own component, so each animation frame re-renders only this text
 * instead of the whole results screen (and its Convex-backed children).
 */
export function CountUp({ value, durationMs }: { value: number; durationMs?: number }) {
  return <>{useCountUp(value, durationMs).toLocaleString()}</>;
}
