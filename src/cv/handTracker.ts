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

export async function createHandTracker(): Promise<HandTracker> {
  if (
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  )
    throw new Error('Worker-based hand tracking is unavailable in this browser');

  return createWorkerTracker();
}
