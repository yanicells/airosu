import type { HandTracker, HandTrackerResult } from './handTracker';

export type TrackerResponse =
  | { type: 'ready'; usingCpuFallback: boolean }
  | ({ type: 'result' } & HandTrackerResult)
  | { type: 'error'; message: string };

export function createWorkerTracker(): Promise<HandTracker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./handTracker.worker.ts', import.meta.url), {
      type: 'module',
    });
    let closed = false;
    let frameBusy = false;
    let active:
      { resolve(result: HandTrackerResult): void; reject(error: Error): void } | undefined;
    const fail = (error: Error) => {
      if (closed) return;
      clearTimeout(timeout);
      closed = true;
      worker.terminate();
      active?.reject(error);
      active = undefined;
      reject(error);
    };
    const timeout = setTimeout(() => fail(new Error('Tracking worker startup timed out')), 30_000);
    worker.onerror = () => fail(new Error('Tracking worker unavailable'));
    worker.onmessage = ({ data }: MessageEvent<TrackerResponse>) => {
      if (closed) return;
      if (data.type === 'error') return fail(new Error(data.message));
      if (data.type === 'result') {
        if (!active) return;
        active.resolve({ landmarks: data.landmarks });
        active = undefined;
        return;
      }
      clearTimeout(timeout);
      resolve({
        usingCpuFallback: data.usingCpuFallback,
        async detect(video, timestampMs) {
          if (closed) throw new Error('Tracker closed');
          if (frameBusy) throw new Error('A tracking frame is already in flight');
          frameBusy = true;
          try {
            const frame = await createImageBitmap(video);
            if (closed) {
              frame.close();
              throw new Error('Tracker closed');
            }
            return await new Promise<HandTrackerResult>((resolveFrame, rejectFrame) => {
              active = { resolve: resolveFrame, reject: rejectFrame };
              try {
                worker.postMessage({ frame, timestampMs }, [frame]);
              } catch (error) {
                frame.close();
                fail(error instanceof Error ? error : new Error('Frame transfer failed'));
              }
            });
          } finally {
            frameBusy = false;
          }
        },
        close() {
          fail(new Error('Tracker closed'));
        },
      });
    };
    try {
      worker.postMessage({ timestampMs: 0 });
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Tracking worker unavailable'));
    }
  });
}
