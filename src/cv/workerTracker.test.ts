import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createWorkerTracker, type TrackerResponse } from './workerTracker';

class FakeWorker {
  static instances: FakeWorker[] = [];
  static throwOnPost = false;
  onmessage: ((event: MessageEvent<TrackerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly script: URL;
  readonly options: WorkerOptions;
  postMessage = vi.fn((data: unknown) => {
    if (FakeWorker.throwOnPost) throw new Error('post failed');
    void data;
  });
  terminate = vi.fn();

  constructor(
    script: URL,
    options: WorkerOptions,
  ) {
    this.script = script;
    this.options = options;
    FakeWorker.instances.push(this);
  }

  send(data: TrackerResponse): void {
    this.onmessage?.({ data } as MessageEvent<TrackerResponse>);
  }
}

const video = {} as HTMLVideoElement;
const makeBitmap = () => ({ close: vi.fn() }) as unknown as ImageBitmap;

beforeEach(() => {
  vi.clearAllMocks();
  FakeWorker.instances = [];
  FakeWorker.throwOnPost = false;
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('createImageBitmap', vi.fn());
});

afterEach(() => vi.unstubAllGlobals());

async function startTracker() {
  const pending = createWorkerTracker();
  const worker = FakeWorker.instances[0];
  expect(worker.script.toString()).toContain('handTracker.worker.ts');
  expect(worker.options).toEqual({ type: 'module' });
  worker.send({ type: 'ready', usingCpuFallback: false });
  return { tracker: await pending, worker };
}

it('keeps one frame in flight while a bitmap is being created', async () => {
  let resolveBitmap!: (bitmap: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockReturnValueOnce(
    new Promise<ImageBitmap>((resolve) => {
      resolveBitmap = resolve;
    }),
  );
  const { tracker, worker } = await startTracker();
  const first = tracker.detect(video, 10);
  await expect(tracker.detect(video, 20)).rejects.toThrow('already in flight');
  const bitmap = makeBitmap();
  resolveBitmap(bitmap);
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2));
  worker.send({ type: 'result', landmarks: null });
  await expect(first).resolves.toEqual({ landmarks: null });
  tracker.close();
});

it('closes a bitmap when the tracker closes during bitmap creation', async () => {
  let resolveBitmap!: (bitmap: ImageBitmap) => void;
  vi.mocked(createImageBitmap).mockReturnValueOnce(
    new Promise<ImageBitmap>((resolve) => {
      resolveBitmap = resolve;
    }),
  );
  const { tracker, worker } = await startTracker();
  const first = tracker.detect(video, 10);
  tracker.close();
  const bitmap = makeBitmap();
  resolveBitmap(bitmap);
  await expect(first).rejects.toThrow('Tracker closed');
  expect(bitmap.close).toHaveBeenCalledOnce();
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it('rejects and terminates when worker startup postMessage fails', async () => {
  FakeWorker.throwOnPost = true;
  await expect(createWorkerTracker()).rejects.toThrow('post failed');
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
});

it('rejects the active frame on a worker error', async () => {
  const bitmap = makeBitmap();
  vi.mocked(createImageBitmap).mockResolvedValueOnce(bitmap);
  const { tracker, worker } = await startTracker();
  const pending = tracker.detect(video, 10);
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2));
  worker.send({ type: 'error', message: 'Tracking failed' });
  await expect(pending).rejects.toThrow('Tracking failed');
  expect(worker.terminate).toHaveBeenCalledOnce();
  tracker.close();
});
