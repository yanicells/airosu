import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHandTracker } from './handTracker';
import { createWorkerTracker } from './workerTracker';

vi.mock('./workerTracker', () => ({ createWorkerTracker: vi.fn() }));

const workerTracker = {
  detect: vi.fn(),
  close: vi.fn(),
  usingCpuFallback: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('Worker', class {});
  vi.stubGlobal('OffscreenCanvas', class {});
  vi.stubGlobal('createImageBitmap', vi.fn());
  vi.mocked(createWorkerTracker).mockResolvedValue(workerTracker);
});

afterEach(() => vi.unstubAllGlobals());

it('fails clearly when worker graphics support is unavailable', async () => {
  vi.stubGlobal('Worker', undefined);
  await expect(createHandTracker()).rejects.toThrow('Worker-based hand tracking is unavailable');
  expect(createWorkerTracker).not.toHaveBeenCalled();
});

it('does not switch to main-thread inference after worker failure', async () => {
  const tracker = await createHandTracker();
  expect(tracker).toBe(workerTracker);
  const error = new Error('Tracking worker unavailable');
  workerTracker.detect.mockRejectedValueOnce(error);
  await expect(tracker.detect({} as HTMLVideoElement, 10)).rejects.toBe(error);
  expect(createWorkerTracker).toHaveBeenCalledOnce();
  expect(workerTracker.close).not.toHaveBeenCalled();
  tracker.close();
  expect(workerTracker.close).toHaveBeenCalledOnce();
});
