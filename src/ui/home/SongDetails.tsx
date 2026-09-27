import { useState } from 'react';
import { starterMaps } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';
import { SelectMenu } from '../shared/SelectMenu';
import { AudioPicker } from './AudioPicker';
import { BeatmapWedge } from './BeatmapWedge';
import { SongRanking, type RankingScope } from './SongRanking';

/** Left column of song select: the beatmap wedge plus Details / Ranking tabs. */
export function SongDetails() {
  const { map, mapset, settings } = useAppState();
  const [tab, setTab] = useState<'details' | 'ranking'>('ranking');
  const [scope, setScope] = useState<RankingScope>('global');
  if (!map)
    return (
      <div className="song-welcome">
        <h1>Find your rhythm.</h1>
        <p>Pick a song from the list, or drop an .osz / .osu anywhere to import it.</p>
      </div>
    );
  const stars = mapset?.preview.difficulties.find((d) => d.name === map.meta.version)?.stars;
  const starter = starterMaps.find((song) => song.url === mapset?.sourceUrl);
  return (
    <>
      <BeatmapWedge map={map} stars={stars} />
      <div className="song-tabs">
        <div role="tablist" aria-label="Beatmap information">
          {(['details', 'ranking'] as const).map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? 'is-active' : ''}
              onClick={() => setTab(name)}
            >
              {name === 'details' ? 'Details' : 'Ranking'}
            </button>
          ))}
        </div>
        {tab === 'ranking' && (
          <div className="song-scope">
            <span>Scope</span>
            <SelectMenu
              ariaLabel="Ranking scope"
              value={scope}
              options={[
                { value: 'global', label: 'Global' },
                { value: 'personal', label: 'Personal' },
              ]}
              onChange={(value) => setScope(value as RankingScope)}
            />
          </div>
        )}
      </div>
      {map.audio.byteLength === 0 && <AudioPicker map={map} />}
      {tab === 'ranking' ? (
        <SongRanking osuText={map.rawOsu} scope={scope} />
      ) : (
        <dl className="song-info">
          <div>
            <dt>Source</dt>
            <dd>{starter ? 'airosu! starter map' : (mapset?.label ?? 'Imported .osu file')}</dd>
          </div>
          {starter && (
            <div>
              <dt>Beatmap page</dt>
              <dd>
                <a href={starter.sourceUrl} target="_blank" rel="noreferrer">
                  {starter.attribution}
                </a>
              </dd>
            </div>
          )}
          <div>
            <dt>Difficulties</dt>
            <dd>{mapset?.preview.difficulties.length ?? 1}</dd>
          </div>
          <div>
            <dt>Play style</dt>
            <dd>
              {settings.inputMode === 'relax' ? 'Relax (hover to hit)' : 'Manual (tap keys to hit)'} ·{' '}
              {settings.cursorAnchor === 'palm' ? 'palm cursor' : 'fingertip cursor'}
            </dd>
          </div>
        </dl>
      )}
    </>
  );
}
