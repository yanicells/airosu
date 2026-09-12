import type { LoadedBeatmap } from './model';
import type { MapsetPreview } from './load';

export type MapRequest =
  | { type: 'open' | 'load'; key: number; bytes?: Uint8Array; name?: string }
  | { type: 'background'; bytes: Uint8Array }
  | { type: 'osu'; text: string };
export interface OpenMapResult { preview: MapsetPreview; map: LoadedBeatmap }
export interface MapResponse {
  id: number;
  result?: OpenMapResult | LoadedBeatmap | Blob;
  error?: string;
}

let worker: Worker | undefined;
let nextId = 0;
let nextKey = 0;
let currentKey: number | undefined;
const keys = new WeakMap<Uint8Array, number>();
const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();

function request<T>(operation: MapRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(new URL('./map.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<MapResponse>) => {
        const task = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) {
          currentKey = undefined;
          task?.reject(new Error(data.error));
        }
        else task?.resolve(data.result);
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = undefined;
        currentKey = undefined;
        for (const task of pending.values()) task.reject(new Error('Map loader failed. Try opening the map again.'));
        pending.clear();
      };
    }
    const id = ++nextId;
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    try {
      worker.postMessage({ ...operation, id });
    } catch (error) {
      pending.delete(id);
      currentKey = undefined;
      reject(error);
    }
  });
}

function archiveRequest(bytes: Uint8Array, type: 'open' | 'load', name?: string): MapRequest {
  let key = keys.get(bytes);
  if (key === undefined) keys.set(bytes, key = ++nextKey);
  const payload = { type, key, bytes: currentKey === key ? undefined : bytes, name };
  currentKey = key;
  return payload;
}

export const openMapArchive = (bytes: Uint8Array) => request<OpenMapResult>(archiveRequest(bytes, 'open'));
export const loadMapDifficulty = (bytes: Uint8Array, name: string) =>
  request<LoadedBeatmap>(archiveRequest(bytes, 'load', name));
export const loadStandaloneMap = (text: string) => request<LoadedBeatmap>({ type: 'osu', text });
export const loadMapBackground = (bytes: Uint8Array) => request<Blob | undefined>({ type: 'background', bytes });
