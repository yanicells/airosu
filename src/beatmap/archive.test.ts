import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { unzipSync, zipSync, strToU8 } from 'fflate';
import { OszArchive } from './load';

vi.mock('fflate', async (original) => {
  const actual = await original<typeof import('fflate')>();
  return { ...actual, unzipSync: vi.fn(actual.unzipSync) };
});

const bytes = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);

describe('reusable map archive', () => {
  it('shares extraction and cached parsing across preview and difficulty switches', () => {
    vi.mocked(unzipSync).mockClear();
    const archive = new OszArchive(bytes);
    const preview = archive.preview();
    const first = archive.load(preview.difficulties[0].name);
    archive.load(preview.difficulties[1].name);
    expect(archive.load(preview.difficulties[0].name)).toBe(first);
    expect(archive.preview()).toBe(preview);
    expect(unzipSync).toHaveBeenCalledTimes(1);
  });

  it('never inflates videos or storyboard files', () => {
    const archive = new OszArchive(
      zipSync({
        'map.osu': strToU8('osu file format v14\n[General]\nMode:0\n[Metadata]\nVersion:Easy'),
        'movie.mp4': new Uint8Array(100),
        'story.osb': new Uint8Array(100),
      }),
    );
    expect(archive.entries).toHaveLength(1);
    const options = vi.mocked(unzipSync).mock.lastCall?.[1];
    expect(
      options?.filter?.({ name: 'movie.mp4', size: 100, originalSize: 100, compression: 0 }),
    ).toBe(false);
    expect(
      options?.filter?.({ name: 'story.osb', size: 100, originalSize: 100, compression: 0 }),
    ).toBe(false);
  });
});
