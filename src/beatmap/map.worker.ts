import { preparePp } from '../game/pp';
import { OszArchive, loadFromOsu, oszBackground } from './load';
import type { MapRequest, MapResponse } from './mapWorker';

// Keep only the selected archive; replacing it releases extracted audio and maps.
let archive: OszArchive | undefined;
let key: number | undefined;
self.onmessage = ({ data }: MessageEvent<MapRequest & { id: number }>) => {
  try {
    let result: MapResponse['result'];
    if (data.type === 'background') result = oszBackground(data.bytes);
    else if (data.type === 'pp') result = preparePp(data.text);
    else if (data.type === 'osu') result = loadFromOsu(data.text, new ArrayBuffer(0));
    else {
      if (key !== data.key || !archive) {
        if (!data.bytes) throw new Error('Reopen the map to load its difficulties');
        archive = new OszArchive(data.bytes);
        key = data.key;
      }
      if (data.type === 'load') result = archive.load(data.name!);
      else {
        const preview = archive.preview();
        if (!preview.difficulties.length)
          throw new Error('No osu! standard difficulties found in .osz');
        result = { preview, map: archive.load(preview.difficulties[0].name) };
      }
    }
    self.postMessage({ id: data.id, result } satisfies MapResponse);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : 'Could not read map',
    } satisfies MapResponse);
  }
};
