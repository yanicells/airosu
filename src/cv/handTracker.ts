import { createWorkerTracker } from './workerTracker';

export interface HandTrackerResult {
  /** 21 normalized landmarks, or null when no hand detected */
  landmarks: { x: number; y: number }[] | null;
}
export interface HandTracker {
  detect(video: HTMLVideoElement, timestampMs: number): Promise<HandTrackerResult>;
  usingCpuFallback: boolean;
  close(): void;
}

async function mainThreadTracker(): Promise<HandTracker> {
  const { createLandmarker } = await import('./handLandmarker');
  const { landmarker, usingCpuFallback } = await createLandmarker();
  return {
    usingCpuFallback,
    async detect(video, timestampMs) {
      return { landmarks: landmarker.detectForVideo(video, timestampMs).landmarks[0] ?? null };
    },
    close() { landmarker.close(); },
  };
}

export async function createHandTracker(): Promise<HandTracker> {
  let workerActive = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
  let engine = workerActive
    ? await createWorkerTracker().catch(() => { workerActive = false; return mainThreadTracker(); })
    : await mainThreadTracker();
  let closed = false;
  return {
    get usingCpuFallback() { return engine.usingCpuFallback; },
    async detect(video, timestampMs) {
      try { return await engine.detect(video, timestampMs); }
      catch (error) {
        if (closed || !workerActive) throw error;
        workerActive = false;
        engine.close();
        engine = await mainThreadTracker();
        if (closed) { engine.close(); throw error; }
        return engine.detect(video, performance.now());
      }
    },
    close() { closed = true; engine.close(); },
  };
}
