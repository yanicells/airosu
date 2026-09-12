import { createLandmarker } from './handLandmarker';
import type { TrackerResponse } from './workerTracker';

let tracker: Awaited<ReturnType<typeof createLandmarker>>;
self.onmessage = async ({ data }: MessageEvent<{ frame?: ImageBitmap; timestampMs: number }>) => {
  try {
    if (!data.frame) {
      tracker = await createLandmarker(true);
      self.postMessage({ type: 'ready', usingCpuFallback: tracker.usingCpuFallback } satisfies TrackerResponse);
    } else {
      const result = tracker.landmarker.detectForVideo(data.frame, data.timestampMs);
      self.postMessage({ type: 'result', landmarks: result.landmarks[0] ?? null } satisfies TrackerResponse);
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Tracking failed' } satisfies TrackerResponse);
  } finally {
    data.frame?.close();
  }
};
