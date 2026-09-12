import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openCamera } from './camera';
import { createHandCursorSource } from './cursorSource';

vi.mock('./camera', () => ({ openCamera: vi.fn() }));
vi.mock('./cursorSource', () => ({ createHandCursorSource: vi.fn() }));

const stopTrack = vi.fn();
const cursor = { start: vi.fn(), stop: vi.fn() };
const play = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.mocked(openCamera).mockResolvedValue({
    getTracks: () => [{ stop: stopTrack }],
  } as unknown as MediaStream);
  vi.mocked(createHandCursorSource).mockReturnValue(
    cursor as unknown as ReturnType<typeof createHandCursorSource>,
  );
  cursor.start.mockResolvedValue(undefined);
  play.mockResolvedValue(undefined);
  vi.stubGlobal('document', {
    createElement: () => ({ play }),
  });
});

afterEach(() => vi.unstubAllGlobals());

it('shares concurrent initialization, including StrictMode mounts', async () => {
  const { getCvSession, stopCvSession } = await import('./cvSession');
  const [first, second] = await Promise.all([getCvSession(), getCvSession()]);
  expect(first).toBe(second);
  expect(openCamera).toHaveBeenCalledTimes(1);
  expect(cursor.start).toHaveBeenCalledTimes(1);
  stopCvSession();
});

it('releases the camera after tracker failure and permits retry', async () => {
  const { getCvSession, stopCvSession } = await import('./cvSession');
  cursor.start.mockRejectedValueOnce(new Error('tracker failed'));
  await expect(getCvSession()).rejects.toThrow('tracker failed');
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(cursor.stop).toHaveBeenCalledOnce();
  await expect(getCvSession()).resolves.toHaveProperty('cursor', cursor);
  stopCvSession();
});

it('does not revive a session stopped while the camera was opening', async () => {
  const { getCvSession, stopCvSession, peekCvSession } = await import('./cvSession');
  const pending = getCvSession();
  stopCvSession();
  await expect(pending).rejects.toThrow('Camera session stopped');
  expect(peekCvSession()).toBeNull();
  expect(stopTrack).toHaveBeenCalledOnce();
});

it('stops camera tracks immediately while tracker initialization is pending', async () => {
  const { getCvSession, stopCvSession } = await import('./cvSession');
  let finishStartup!: () => void;
  cursor.start.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finishStartup = resolve;
    }),
  );
  const starting = getCvSession();
  await vi.waitFor(() => expect(cursor.start).toHaveBeenCalledOnce());
  stopCvSession();
  expect(stopTrack).toHaveBeenCalledOnce();
  expect(cursor.stop).toHaveBeenCalledOnce();
  finishStartup();
  await expect(starting).rejects.toThrow('Camera session stopped');
  expect(stopTrack).toHaveBeenCalledOnce();
});

it('does not start tracking after stopping while video play is pending', async () => {
  let finishPlay!: () => void;
  play.mockReturnValueOnce(new Promise<void>((resolve) => {
    finishPlay = resolve;
  }));
  const { getCvSession, stopCvSession } = await import('./cvSession');
  const starting = getCvSession();
  await vi.waitFor(() => expect(play).toHaveBeenCalledOnce());
  stopCvSession();
  finishPlay();
  await expect(starting).rejects.toThrow('Camera session stopped');
  expect(cursor.start).not.toHaveBeenCalled();
  expect(cursor.stop).toHaveBeenCalledOnce();
});
