import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

const BASE_ORIGIN = 'http://127.0.0.1:4173';

const OSU_MAP = `osu file format v14

[General]
AudioFilename: song.wav
AudioLeadIn: 0
PreviewTime: 1000
Mode: 0

[Metadata]
Title: Browser Smoke
TitleUnicode: Browser Smoke
Artist: airosu
ArtistUnicode: airosu
Creator: Test
Version: Smoke
Source:
Tags: browser smoke
BeatmapID: 1
BeatmapSetID: 1

[Difficulty]
HPDrainRate: 5
CircleSize: 4
OverallDifficulty: 5
ApproachRate: 5
SliderMultiplier: 1.4
SliderTickRate: 1

[TimingPoints]
0,500

[HitObjects]
256,192,10000,1,0
128,96,15000,1,0
384,288,20000,1,0
`;

const REPLACEMENT_MAP = OSU_MAP
  .replaceAll('Browser Smoke', 'Replacement Map')
  .replace('song.wav', 'replacement.wav');

function wavBytes(durationMs = 22_000): Buffer {
  const sampleRate = 8_000;
  const samples = Math.floor((durationMs / 1000) * sampleRate);
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
}

const TRACKER_SCRIPT = `
  let failed = false;
  self.onmessage = ({ data }) => {
    if (data.__fail) {
      failed = true;
      return;
    }
    if (!data.frame) {
      self.postMessage({ type: 'ready', usingCpuFallback: false });
      return;
    }
    if (failed) {
      self.postMessage({ type: 'error', message: 'Synthetic tracking failure' });
    } else {
      self.postMessage({ type: 'result', landmarks: null });
    }
    data.frame.close();
  };
`;

declare global {
  interface Window {
    __airosuAudio: { contexts: AudioContext[] };
    __airosuAudioPicker: {
      slowStarted: boolean;
      slowReadDone: Promise<void>;
      releaseSlow: (() => void) | null;
    };
    __airosuTracking: { fail(): void };
  }
}

const pageErrors = new WeakMap<Page, string[]>();

async function installBrowserFakes(page: Page): Promise<void> {
  await page.addInitScript(
    ({ trackerScript }) => {
      const nativeWorker = window.Worker;
      const trackerWorkers: Worker[] = [];
      const trackerUrl = URL.createObjectURL(new Blob([trackerScript], { type: 'text/javascript' }));

      function TestWorker(url: string | URL, options?: WorkerOptions): Worker {
        if (String(url).includes('handTracker.worker')) {
          const worker = new nativeWorker(trackerUrl, options);
          trackerWorkers.push(worker);
          return worker;
        }
        return new nativeWorker(url, options);
      }
      TestWorker.prototype = nativeWorker.prototype;
      window.Worker = TestWorker as unknown as typeof Worker;

      const nativeAudioContext = window.AudioContext;
      const audio = { contexts: [] as AudioContext[] };
      class TestAudioContext extends nativeAudioContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          audio.contexts.push(this);
        }
      }
      window.AudioContext = TestAudioContext;

      const nativeArrayBuffer = File.prototype.arrayBuffer;
      let resolveSlowRead: (() => void) | null = null;
      const slowReadDone = new Promise<void>((resolve) => {
        resolveSlowRead = resolve;
      });
      const audioPicker = {
        slowStarted: false,
        slowReadDone,
        releaseSlow: null as (() => void) | null,
      };
      File.prototype.arrayBuffer = async function () {
        const slow = this.name === 'slow.wav';
        if (slow) {
          audioPicker.slowStarted = true;
          await new Promise<void>((resolve) => {
            audioPicker.releaseSlow = resolve;
          });
        }
        const bytes = await nativeArrayBuffer.call(this);
        if (slow) resolveSlowRead?.();
        return bytes;
      };

      window.__airosuTracking = {
        fail() {
          for (const worker of trackerWorkers) worker.postMessage({ __fail: true });
        },
      };
      window.__airosuAudio = audio;
      window.__airosuAudioPicker = audioPicker;

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const context = canvas.getContext('2d');
            const stream = canvas.captureStream(60);
            const draw = () => {
              if (
                !stream.getVideoTracks()[0]?.readyState ||
                stream.getVideoTracks()[0].readyState === 'ended'
              )
                return;
              context?.fillRect(0, 0, canvas.width, canvas.height);
              requestAnimationFrame(draw);
            };
            draw();
            return stream;
          },
        },
      });
    },
    { trackerScript: TRACKER_SCRIPT },
  );
}

async function uploadMap(page: Page, name: string, text: string): Promise<void> {
  await page.locator('input[type="file"][accept=".osz,.osu"]').setInputFiles({
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(text),
  });
}

async function openStandaloneMap(page: Page, start = true): Promise<void> {
  await page.getByRole('button', { name: 'Open main menu' }).click();
  await page.getByRole('button', { name: /Play Find your next beat/ }).click();
  await uploadMap(page, 'browser-smoke.osu', OSU_MAP);
  await expect(page.getByRole('heading', { name: 'Browser Smoke' })).toBeVisible();
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
    name: 'song.wav',
    mimeType: 'audio/wav',
    buffer: wavBytes(),
  });
  await expect(page.locator('.song-start')).toBeEnabled();
  if (!start) return;
  await page.locator('.song-start').click();
  await expect(page.getByRole('heading', { name: 'Your aim area' })).toBeVisible();
}

async function enterGameplay(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Use this area' }).click();
  await page.getByRole('button', { name: 'Looks good — Continue' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.count-pop')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== BASE_ORIGIN) {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.routeWebSocket('**/*', () => {});
  await installBrowserFakes(page);
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('starts production build and supports custom SelectMenu keyboard semantics', async ({ page }) => {
  await expect(page.getByText('A little rhythm. A little motion.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open main menu' })).toBeVisible();
  await openStandaloneMap(page, false);
  const trigger = page.getByRole('button', { name: 'Input mode' });
  await trigger.press('ArrowDown');
  const listbox = page.getByRole('listbox', { name: 'Input mode' });
  await expect(listbox).toBeVisible();
  const activeId = await listbox.getAttribute('aria-activedescendant');
  expect(activeId).toBeTruthy();
  await expect(page.locator(`#${activeId}`)).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator(`#${activeId}`)).toHaveText(/Manual/);
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText(/Manual/);
  await expect(listbox).toBeHidden();
});

test('does not let a slow AudioPicker read replace a newer standalone map', async ({ page }) => {
  await page.getByRole('button', { name: 'Open main menu' }).click();
  await page.getByRole('button', { name: /Play Find your next beat/ }).click();
  await uploadMap(page, 'browser-smoke.osu', OSU_MAP);
  await expect(page.getByRole('heading', { name: 'Browser Smoke' })).toBeVisible();
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
    name: 'slow.wav',
    mimeType: 'audio/wav',
    buffer: wavBytes(),
  });
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudioPicker.slowStarted))
    .toBe(true);

  await uploadMap(page, 'replacement.osu', REPLACEMENT_MAP);
  await expect(page.getByRole('heading', { name: 'Replacement Map' })).toBeVisible();
  await page.evaluate(() => {
    window.__airosuAudioPicker.releaseSlow?.();
    return window.__airosuAudioPicker.slowReadDone;
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await expect(page.getByRole('heading', { name: 'Replacement Map' })).toBeVisible();
  await expect(page.getByText('Choose audio: replacement.wav')).toBeVisible();
});

test('pauses on an interrupted native AudioContext and resumes its preserved clock', async ({ page }) => {
  await openStandaloneMap(page);
  await enterGameplay(page);
  await expect(page.locator('.count-pop')).toBeHidden({ timeout: 10_000 });
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudio.contexts.at(-1)?.state))
    .toBe('running');

  await page.evaluate(async () => {
    await window.__airosuAudio.contexts.at(-1)?.suspend();
  });
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudio.contexts.at(-1)?.state))
    .toBe('suspended');
  await expect(page.getByRole('heading', { name: 'Take a breath.' })).toBeVisible();
  const pausedAt = await page.evaluate(
    () => window.__airosuAudio.contexts.at(-1)?.currentTime ?? 0,
  );
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudio.contexts.at(-1)?.currentTime ?? 0))
    .toBeLessThan(pausedAt + 0.05);

  await page.getByRole('button', { name: /Resume Return to the beatmap/ }).click();
  await expect(page.getByRole('heading', { name: 'Take a breath.' })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudio.contexts.at(-1)?.state))
    .toBe('running');
  await expect
    .poll(() => page.evaluate(() => window.__airosuAudio.contexts.at(-1)?.currentTime ?? 0))
    .toBeGreaterThan(pausedAt + 0.05);
});

test('surfaces a terminal hand-tracking error during gameplay', async ({ page }) => {
  await openStandaloneMap(page);
  await enterGameplay(page);
  await expect(page.locator('.count-pop')).toBeHidden({ timeout: 10_000 });
  await page.evaluate(() => {
    window.__airosuTracking.fail();
  });
  await expect(page.getByText('Synthetic tracking failure')).toBeVisible();
  await expect(page.getByRole('button', { name: /Back to (home|song select)/ })).toBeVisible();
});
