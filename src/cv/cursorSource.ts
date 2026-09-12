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
  /** terminal tracking failure; the source stops until restarted */
  error?: string;
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

export function cursorFilterOptions(
  smoothing: number,
  anchor: CursorAnchor,
): { minCutoff: number; beta: number } {
  return anchor === 'index'
    ? { minCutoff: Math.max(2.25 - smoothing * 2, 0.1), beta: 0.04 }
    : { minCutoff: Math.max(2.5 - smoothing * 2, 0.1), beta: 0.025 };
}

function makeFilter(smoothing: number, anchor: CursorAnchor): OneEuroFilter2D {
  return new OneEuroFilter2D(cursorFilterOptions(smoothing, anchor));
}

export function createHandCursorSource(): CursorSource {
  let tracker: HandTracker | null = null;
  let box = defaultBox();
  let sensitivity = 1;
  let mirror = true;
  let cursorAnchor: CursorAnchor = 'palm';
  let filter = makeFilter(0.5, cursorAnchor);
  let cancelFrame = () => {};
  let generation = 0;
  let smoothing = 0.5;
  let running = false;
  let lastVideoTime = -1;
  let lastTrackedAt = -Infinity;
  let lastSample: CursorSample = { playfield: null, camera: null, tMs: 0 };
  const listeners = new Set<(s: CursorSample) => void>();

  const emit = (s: CursorSample) => {
    lastSample = s;
    for (const cb of listeners) cb(s);
  };

  return {
    async start(video: HTMLVideoElement) {
      if (running) return;
      running = true;
      const current = ++generation;
      let started: HandTracker;
      try {
        started = await createHandTracker();
      } catch (error) {
        if (current === generation) running = false;
        throw error;
      }
      if (current !== generation) {
        started.close();
        return;
      }
      tracker = started;
      let busy = false;
      let frameId = 0;
      const videoFrames = typeof video.requestVideoFrameCallback === 'function';
      const resume = () => {
        if (running && video.paused) void video.play().catch(() => {});
      };
      video.addEventListener('pause', resume);
      const schedule = () => {
        frameId = videoFrames ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
      };
      const loop = async (now: number) => {
        if (current !== generation || !running) return;
        schedule();
        resume();
        if (busy || video.paused || video.readyState < 2) return;
        if (!videoFrames && video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        busy = true;
        try {
          const result = await started.detect(video, now);
          if (current !== generation) return;
          if (!result.landmarks) {
            emit({ playfield: null, camera: null, tMs: now });
            return;
          }
          if (now - lastTrackedAt > LOST_RESET_MS) filter.reset();
          lastTrackedAt = now;
          const raw = cursorPoint(result.landmarks, cursorAnchor);
          const mapped = mapToPlayfield(raw, box, sensitivity, mirror);
          const smoothed = smoothing === 0 ? mapped : filter.filter(mapped, now / 1000);
          emit({ playfield: smoothed, camera: raw, tMs: now });
        } catch (error) {
          if (current !== generation) return;
          running = false;
          cancelFrame();
          tracker?.close();
          tracker = null;
          emit({
            playfield: null,
            camera: null,
            error: error instanceof Error ? error.message : 'Hand tracking failed',
            tMs: now,
          });
        } finally {
          busy = false;
        }
      };
      cancelFrame = () => {
        if (videoFrames) video.cancelVideoFrameCallback(frameId);
        else cancelAnimationFrame(frameId);
        video.removeEventListener('pause', resume);
      };
      schedule();
    },

    onSample(cb) {
      listeners.add(cb);
      if (lastSample.tMs > 0) cb(lastSample);
      return () => listeners.delete(cb);
    },

    setCalibration(b) {
      box = b;
      filter.reset();
    },

    setSettings(s) {
      sensitivity = s.sensitivity;
      smoothing = s.smoothing;
      mirror = s.mirror;
      cursorAnchor = s.cursorAnchor;
      filter = makeFilter(s.smoothing, cursorAnchor);
    },

    usingCpuFallback() {
      return tracker?.usingCpuFallback ?? false;
    },

    stop() {
      running = false;
      generation++;
      cancelFrame();
      lastVideoTime = -1;
      lastTrackedAt = -Infinity;
      lastSample = { playfield: null, camera: null, tMs: 0 };
      tracker?.close();
      tracker = null;
      listeners.clear();
    },
  };
}
