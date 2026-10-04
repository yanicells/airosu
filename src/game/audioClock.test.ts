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

it('reports audio interruptions and waits for resume before reporting a running clock', async () => {
  let state: AudioContextState = 'running';
  let currentTime = 10;
  let finishResume!: () => void;
  const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  vi.stubGlobal('AudioContext', class {
    get state() { return state; }
    get currentTime() { return currentTime; }
    close = vi.fn().mockResolvedValue(undefined);
    decodeAudioData = vi.fn().mockResolvedValue({});
    createGain = () => ({ gain: { value: 1 }, connect: vi.fn() });
    createBufferSource = () => source;
    resume = () => new Promise<void>((resolve) => {
      finishResume = () => { state = 'running'; resolve(); };
    });
  });
  const clock = await AudioClock.create(new ArrayBuffer(0), 1);
  clock.start();
  currentTime = 11;
  expect(clock.nowMs(20)).toBe(1020);
  state = 'suspended';
  expect(clock.running).toBe(false);
  const resuming = clock.resume();
  expect(clock.running).toBe(false);
  finishResume();
  await resuming;
  expect(clock.running).toBe(true);
  expect(clock.nowMs(20)).toBe(1020);
  clock.stop();
  expect(clock.running).toBe(false);
  await expect(clock.resume()).rejects.toThrow('Audio has stopped');
});

function fakeContext(latency: { outputLatency?: number; baseLatency?: number }) {
  const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const ctx = { currentTime: 10 };
  vi.stubGlobal('AudioContext', class {
    get currentTime() { return ctx.currentTime; }
    outputLatency = latency.outputLatency;
    baseLatency = latency.baseLatency;
    state = 'running';
    close = vi.fn().mockResolvedValue(undefined);
    decodeAudioData = vi.fn().mockResolvedValue({});
    createGain = () => ({ gain: { value: 1 }, connect: vi.fn() });
    createBufferSource = () => source;
  });
  return { source, ctx };
}

it('runs behind the context clock by the output latency', async () => {
  const { ctx } = fakeContext({ outputLatency: 0.1, baseLatency: 0.01 });
  const clock = await AudioClock.create(new ArrayBuffer(0), 1);
  clock.start();
  ctx.currentTime = 11;
  expect(clock.nowMs(20)).toBeCloseTo(1000 - 100 + 20);
});

it('falls back to base latency and ignores missing or absurd values', async () => {
  const cases: [Parameters<typeof fakeContext>[0], number][] = [
    [{ outputLatency: 0, baseLatency: 0.02 }, 20],
    [{}, 0],
    [{ outputLatency: Number.NaN }, 0],
    [{ outputLatency: 5 }, 500],
  ];
  for (const [latency, expected] of cases) {
    const { ctx } = fakeContext(latency);
    const clock = await AudioClock.create(new ArrayBuffer(0), 1);
    clock.start();
    ctx.currentTime = 11;
    expect(clock.nowMs(0)).toBeCloseTo(1000 - expected);
  }
});

it('schedules audio after a lead-in and counts up from negative time', async () => {
  const { source, ctx } = fakeContext({});
  const clock = await AudioClock.create(new ArrayBuffer(0), 1);
  clock.start(1500);
  expect(source.start).toHaveBeenCalledWith(11.5);
  expect(clock.nowMs(0)).toBeCloseTo(-1500);
  ctx.currentTime = 12;
  expect(clock.nowMs(0)).toBeCloseTo(500);
});
