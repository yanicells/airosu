import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export interface HandTrackerResult {
  /** 21 normalized landmarks, or null when no hand detected */
  landmarks: { x: number; y: number }[] | null;
}

export interface HandTracker {
  detect(video: HTMLVideoElement, timestampMs: number): HandTrackerResult;
  /** true when the GPU delegate failed and CPU fallback is in use */
  usingCpuFallback: boolean;
  close(): void;
}

export async function createHandTracker(): Promise<HandTracker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  let usingCpuFallback = false;
  let landmarker: HandLandmarker;
  try {
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  } catch {
    usingCpuFallback = true;
    landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  }

  return {
    usingCpuFallback,
    detect(video, timestampMs) {
      const result = landmarker.detectForVideo(video, timestampMs);
      const landmarks = result.landmarks[0];
      return { landmarks: landmarks ?? null };
    },
    close() {
      landmarker.close();
    },
  };
}
