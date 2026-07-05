import { describe, it, expect } from 'vitest';
import { parseMapFilename } from './bundled';

describe('parseMapFilename', () => {
  it('splits id, artist and title', () => {
    expect(parseMapFilename('320118 Reol - No title.osz')).toEqual({
      id: '320118',
      artist: 'Reol',
      title: 'No title',
    });
  });

  it('keeps hyphens inside the title', () => {
    expect(parseMapFilename('596704 ClariS - Hitorigoto -TV MIX- [no video].osz')).toEqual({
      id: '596704',
      artist: 'ClariS',
      title: 'Hitorigoto -TV MIX- [no video]',
    });
  });

  it('handles names without the id prefix', () => {
    expect(parseMapFilename('Artist - Song.osz')).toEqual({
      id: null,
      artist: 'Artist',
      title: 'Song',
    });
  });

  it('falls back to the bare name when the pattern misses', () => {
    expect(parseMapFilename('weirdname.osz')).toEqual({
      id: null,
      artist: '',
      title: 'weirdname',
    });
  });
});
