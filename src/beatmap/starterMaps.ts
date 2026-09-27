export interface StarterMapEntry {
  id: string;
  artist: string;
  title: string;
  file: string;
  sha256: string;
  byteLength: number;
  license: string;
  sourceUrl: string;
  attribution: string;
  evidence: string;
}

/** `backgroundUrl` is artwork extracted at build time; absent if the archive has none. */
export type StarterMap = StarterMapEntry & { url: string; backgroundUrl?: string };

export { default as starterMaps } from 'virtual:starter-maps';
