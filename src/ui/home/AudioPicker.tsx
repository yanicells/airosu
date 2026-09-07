import { useState } from 'react';
import type { LoadedBeatmap } from '../../beatmap/model';
import { useAppState } from '../appState';

/** A standalone .osu file does not contain its referenced audio. */
export function AudioPicker({ map }: { map: LoadedBeatmap }) {
  const { setMap } = useAppState();
  const [error, setError] = useState<string>();

  return (
    <div>
      <label className="btn">
        Choose audio: {map.meta.audioFilename}
        <input
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              const audio = await file.arrayBuffer();
              if (!audio.byteLength) throw new Error('Audio file is empty');
              setMap({ ...map, audio });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not read audio');
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
