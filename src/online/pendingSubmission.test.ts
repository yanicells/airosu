import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PENDING_TTL_MS,
  clearPendingSubmission,
  readPendingSubmission,
  savePendingSubmission,
} from './pendingSubmission';

const play = {
  playId: '11111111-1111-4111-8111-111111111111',
  score: 1234,
  maxCombo: 10,
  counts: { 300: 9, 100: 1, 50: 0, 0: 0 },
  inputMode: 'relax' as const,
  forgiveness: 1.5,
  cursorAnchor: 'palm' as const,
};

describe('pending submission', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('round-trips only the fields needed to submit', () => {
    const result = { ...play, pp: 99, accuracy: 1 };
    savePendingSubmission({ osuText: 'osu', play: result }, 0);
    expect(readPendingSubmission(1000)).toEqual({ osuText: 'osu', play });
  });

  it('drops expired or malformed entries', () => {
    savePendingSubmission({ osuText: 'osu', play }, 0);
    expect(readPendingSubmission(PENDING_TTL_MS)).toBeNull();
    sessionStorage.setItem('airosu.pendingSubmission', '{"version":1,"savedAt":0}');
    expect(readPendingSubmission(0)).toBeNull();
    sessionStorage.setItem('airosu.pendingSubmission', 'not json');
    expect(readPendingSubmission(0)).toBeNull();
  });

  it('clears', () => {
    savePendingSubmission({ osuText: 'osu', play }, 0);
    clearPendingSubmission();
    expect(readPendingSubmission(0)).toBeNull();
  });
});
