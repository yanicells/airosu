import { afterEach, beforeEach, expect, it, vi } from 'vitest';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: MessageEvent) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  reply(result: unknown) {
    const { id } = this.postMessage.mock.lastCall![0];
    this.onmessage?.({ data: { id, result } } as MessageEvent);
  }
}
beforeEach(() => {
  vi.resetModules();
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
});
afterEach(() => vi.unstubAllGlobals());

it('sends archive bytes once per selection and resends after worker failure', async () => {
  const { openMapArchive, loadMapDifficulty } = await import('./mapWorker');
  const bytes = new Uint8Array([1, 2]);
  const opened = openMapArchive(bytes);
  const worker = FakeWorker.instances[0];
  expect(worker.postMessage.mock.lastCall![0].bytes).toBe(bytes);
  worker.reply({ preview: {}, map: {} });
  await opened;
  const loading = loadMapDifficulty(bytes, 'Hard');
  expect(worker.postMessage.mock.lastCall![0].bytes).toBeUndefined();
  worker.onerror!();
  await expect(loading).rejects.toThrow('Map loader failed');
  expect(worker.terminate).toHaveBeenCalledOnce();
  const retry = loadMapDifficulty(bytes, 'Hard');
  const restarted = FakeWorker.instances[1];
  expect(restarted.postMessage.mock.lastCall![0].bytes).toBe(bytes);
  restarted.reply({ rawOsu: 'test' });
  await expect(retry).resolves.toEqual({ rawOsu: 'test' });
});
