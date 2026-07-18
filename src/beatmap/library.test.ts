import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteMapset, getMapsetBytes, listMapsets, saveMapset } from './library';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('map library', () => {
  beforeEach(async () => {
    for (const e of await listMapsets()) await deleteMapset(e.id);
  });

  it('round-trips a mapset', async () => {
    const entry = await saveMapset(bytes('osz-bytes'), 'Artist — Title', 3);
    expect(entry.id).toMatch(/^[0-9a-f]{64}$/);
    const listed = await listMapsets();
    expect(listed).toHaveLength(1);
    expect(listed[0].label).toBe('Artist — Title');
    expect(listed[0].difficultyCount).toBe(3);
    expect(listed[0].byteLength).toBe(bytes('osz-bytes').byteLength);
    expect(await getMapsetBytes(entry.id)).toEqual(bytes('osz-bytes'));
  });

  it('dedupes identical bytes', async () => {
    await saveMapset(bytes('same'), 'first', 1);
    await saveMapset(bytes('same'), 'second', 1);
    expect(await listMapsets()).toHaveLength(1);
  });

  it('lists newest first and deletes', async () => {
    const a = await saveMapset(bytes('a'), 'A', 1);
    await new Promise((r) => setTimeout(r, 5));
    await saveMapset(bytes('b'), 'B', 2);
    expect((await listMapsets()).map((e) => e.label)).toEqual(['B', 'A']);
    await deleteMapset(a.id);
    expect(await getMapsetBytes(a.id)).toBeUndefined();
  });
});
