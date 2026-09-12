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

export type StarterMap = StarterMapEntry & { url: string };

export { default as starterMaps } from 'virtual:starter-maps';
