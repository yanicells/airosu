import type { Vec2 } from '../beatmap/model';
import type { Settings } from '../ui/appState';
import { OneEuroFilter2D } from './filters';
import { cursorPoint, type CursorAnchor } from './cursorPoint';
import { defaultBox, mapToPlayfield } from './calibration';
import type { CalibrationBox } from './calibration';
import { createHandTracker } from './handTracker';
import type { HandTracker } from './handTracker';

export interface CursorSample {
  /** null = tracking lost */
  playfield: Vec2 | null;
  /** selected raw cursor point in camera space (0–1), null when lost */
  camera: Vec2 | null;
  tMs: number;
}

export interface CursorSource {
  start(video: HTMLVideoElement): Promise<void>;
  onSample(cb: (s: CursorSample) => void): () => void;
  setCalibration(box: CalibrationBox): void;
  setSettings(s: Pick<Settings, 'sensitivity' | 'smoothing' | 'mirror' | 'cursorAnchor'>): void;
  /** true once started and the GPU delegate failed */
  usingCpuFallback(): boolean;
  stop(): void;
}

const LOST_RESET_MS = 500;

function makeFilter(smoothing: number): OneEuroFilter2D {
  const minCutoff = Math.max(1.5 - smoothing, 0.1);
  return new OneEuroFilter2D({ minCutoff, beta: 0.007 });
}

export function createHandCursorSource(): CursorSource {
  let tracker: HandTracker | null = null;
  let box = defaultBox();
  let sensitivity = 1;
  let mirror = true;
  let cursorAnchor: CursorAnchor = 'palm';
  let filter = makeFilter(0.5);
  let rafId = 0;
  let running = false;
  let lastVideoTime = -1;
  let lostSince: number | null = null;
  let lastSample: CursorSample = { playfield: null, camera: null, tMs: 0 };
  const listeners = new Set<(s: CursorSample) => void>();

  const emit = (s: CursorSample) => {
    lastSample = s;
    for (const cb of listeners) cb(s);
  };

  return {
    async start(video: HTMLVideoElement) {
      if (running) return;
      tracker = await createHandTracker();
      running = true;

      const loop = () => {
        if (!running) return;
        rafId = requestAnimationFrame(loop);
        // the browser pauses a <video> when it is removed from the document
        // (screen transitions re-parent it), which freezes currentTime and
        // stalls tracking — resume it and wait for the next frame
        if (video.paused) {
          video.play().catch(() => {});
          return;
        }
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        const now = performance.now();
        const result = tracker!.detect(video, now);

        if (!result.landmarks) {
          if (lostSince === null) lostSince = now;
          if (now - lostSince > LOST_RESET_MS) filter.reset();
          emit({ playfield: null, camera: null, tMs: now });
          return;
        }
        lostSince = null;
        const raw = cursorPoint(result.landmarks, cursorAnchor);
        const mapped = mapToPlayfield(raw, box, sensitivity, mirror);
        const smoothed = filter.filter(mapped, now / 1000);
        emit({ playfield: smoothed, camera: raw, tMs: now });
      };
      rafId = requestAnimationFrame(loop);
    },

    onSample(cb) {
      listeners.add(cb);
      if (lastSample.tMs > 0) cb(lastSample);
      return () => listeners.delete(cb);
    },

    setCalibration(b) {
      box = b;
    },

    setSettings(s) {
      sensitivity = s.sensitivity;
      mirror = s.mirror;
      cursorAnchor = s.cursorAnchor;
      filter = makeFilter(s.smoothing);
    },

    usingCpuFallback() {
      return tracker?.usingCpuFallback ?? false;
    },

    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      tracker?.close();
      tracker = null;
      listeners.clear();
    },
  };
}
