import { afterEach, expect, it, vi } from 'vitest';
import { AudioClock } from './audioClock';

afterEach(() => vi.unstubAllGlobals());

it('closes its context when decoding fails', async () => {
  const close = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('AudioContext', class {
    close = close;
    decodeAudioData = vi.fn().mockRejectedValue(new Error('bad audio'));
  });
  await expect(AudioClock.create(new ArrayBuffer(0), 1)).rejects.toThrow('bad audio');
  expect(close).toHaveBeenCalledOnce();
});

it('stops and closes only once across finish and unmount', async () => {
  const close = vi.fn().mockResolvedValue(undefined);
  const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  vi.stubGlobal('AudioContext', class {
    close = close;
    decodeAudioData = vi.fn().mockResolvedValue({});
    createGain = () => ({ gain: { value: 1 }, connect: vi.fn() });
    createBufferSource = () => source;
  });
  const clock = await AudioClock.create(new ArrayBuffer(0), 1);
  clock.stop();
  clock.stop();
  expect(source.stop).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});
