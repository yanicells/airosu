import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHandCursorSource } from './cursorSource';
import { createHandTracker } from './handTracker';
import { defaultSettings } from '../ui/appState';

vi.mock('./handTracker', () => ({ createHandTracker: vi.fn() }));
const tracker = { detect: vi.fn(), close: vi.fn(), usingCpuFallback: false };
let frame: (now: number) => void;
const video = {
  paused: false,
  readyState: 2,
  currentTime: 0,
  requestVideoFrameCallback: vi.fn((cb) => {
    frame = cb;
    return 1;
  }),
  cancelVideoFrameCallback: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createHandTracker).mockResolvedValue(tracker);
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  tracker.detect.mockResolvedValue({ landmarks: null });
});
afterEach(() => vi.unstubAllGlobals());

it('runs on camera frames and drops frames while inference is busy', async () => {
  const source = createHandCursorSource();
  let resolve!: (value: { landmarks: null }) => void;
  tracker.detect.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  await source.start(video as unknown as HTMLVideoElement);
  frame(10);
  frame(20);
  expect(tracker.detect).toHaveBeenCalledTimes(1);
  resolve({ landmarks: null });
  await Promise.resolve();
  frame(30);
  expect(tracker.detect).toHaveBeenCalledTimes(2);
  source.stop();
  expect(video.cancelVideoFrameCallback).toHaveBeenCalled();
});

it('closes a tracker that finishes starting after stop', async () => {
  let resolve!: (value: typeof tracker) => void;
  vi.mocked(createHandTracker).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const source = createHandCursorSource();
  const starting = source.start(video as unknown as HTMLVideoElement);
  source.stop();
  resolve(tracker);
  await starting;
  expect(tracker.close).toHaveBeenCalledOnce();
  expect(video.requestVideoFrameCallback).not.toHaveBeenCalled();
});

it('zero smoothing emits the current position without filter delay', async () => {
  const source = createHandCursorSource();
  source.setSettings({ ...defaultSettings, smoothing: 0, mirror: false });
  const receive = vi.fn();
  source.onSample(receive);
  await source.start(video as unknown as HTMLVideoElement);
  tracker.detect.mockResolvedValue({
    landmarks: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
  });
  frame(10);
  await Promise.resolve();
  tracker.detect.mockResolvedValue({
    landmarks: Array.from({ length: 21 }, () => ({ x: 0.75, y: 0.75 })),
  });
  frame(30);
  await Promise.resolve();
  expect(receive.mock.lastCall?.[0].playfield).toEqual({ x: 512, y: 384 });
  source.stop();
});

it('falls back to animation frames without detecting the same video frame twice', async () => {
  vi.mocked(requestAnimationFrame).mockImplementation((callback) => { frame = callback; return 1; });
  const fallbackVideo = { ...video, currentTime: 0, requestVideoFrameCallback: undefined };
  const source = createHandCursorSource();
  await source.start(fallbackVideo as unknown as HTMLVideoElement);
  frame(10);
  await Promise.resolve();
  frame(20);
  expect(tracker.detect).toHaveBeenCalledOnce();
  fallbackVideo.currentTime = 1;
  frame(30);
  await Promise.resolve();
  expect(tracker.detect).toHaveBeenCalledTimes(2);
  source.stop();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
