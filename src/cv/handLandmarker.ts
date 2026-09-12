import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export async function createLandmarker(inWorker = false) {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm', inWorker,
  );
  const options = {
    runningMode: 'VIDEO' as const,
    numHands: 1,
    ...(inWorker ? { canvas: new OffscreenCanvas(640, 480) } : {}),
  };
  let usingCpuFallback = false;
  let landmarker: HandLandmarker;
  try {
    landmarker = await HandLandmarker.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    });
  } catch {
    usingCpuFallback = true;
    landmarker = await HandLandmarker.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
    });
  }
  return { landmarker, usingCpuFallback };
}
