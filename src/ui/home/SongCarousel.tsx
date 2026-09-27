import { useEffect, useRef } from 'react';
import type { StarterMap } from '../../beatmap/starterMaps';
import { useAppState } from '../appState';
import { SetPanel, StarterSetPanel } from './SetPanel';
import { SongDifficulties } from './SongDifficulties';
import { LibrarySetPanel } from './YourMaps';
import type { useLibrary } from './useLibrary';
import type { useMapLoader } from './useMapLoader';

const matches = (text: string, query: string) => text.toLowerCase().includes(query.toLowerCase());

/** Right-hand carousel: starter + imported sets, the selected one expanded into difficulties. */
export function SongCarousel({
  search,
  starters,
  library,
  loader,
}: {
  search: string;
  starters: StarterMap[];
  library: ReturnType<typeof useLibrary>;
  loader: ReturnType<typeof useMapLoader>;
}) {
  const { map, mapset } = useAppState();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedKey = loader.busyUrl ?? mapset?.sourceUrl;
  const visibleStarters = starters.filter((song) => matches(`${song.title} ${song.artist}`, search));
  const visibleLibrary = library.entries.filter((entry) => matches(entry.label, search));
  const known =
    starters.some((song) => song.url === selectedKey) ||
    library.entries.some((entry) => `library:${entry.id}` === selectedKey);

  // Centre the selected set inside the carousel only; scrollIntoView would also scroll the page.
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('.set-panel.is-selected');
    if (!list || !selected) return;
    const top =
      list.scrollTop +
      selected.getBoundingClientRect().top -
      list.getBoundingClientRect().top -
      list.clientHeight / 3;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }, [selectedKey, map?.meta.version]);

  const expanded = (key?: string) =>
    key === mapset?.sourceUrl && mapset ? (
      <SongDifficulties
        difficulties={mapset.preview.difficulties}
        picked={mapset.pickedName}
        creator={map?.meta.creator}
        onPick={(name) => void loader.pickDifficulty(name)}
      />
    ) : null;
  const dots = (key: string) =>
    key === mapset?.sourceUrl ? mapset.preview.difficulties.map((d) => d.stars) : undefined;

  return (
    <div
      ref={listRef}
      className="song-carousel"
      aria-label="Songs"
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp'].includes(event.key) || loader.busy) return;
        const faces = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.set-panel__face')];
        const current = faces.indexOf(event.target as HTMLButtonElement);
        if (current < 0) return;
        event.preventDefault();
        const next = faces[(current + (event.key === 'ArrowDown' ? 1 : -1) + faces.length) % faces.length];
        next.focus();
        next.click();
      }}
    >
      {/* a loose .osu, or a fresh import not yet listed in storage */}
      {!known && map && (
        <SetPanel
          title={map.meta.title}
          artist={map.meta.artist}
          badge={mapset ? 'imported' : 'local file'}
          selected
          stars={mapset?.preview.difficulties.map((d) => d.stars)}
          onPick={() => {}}
        >
          <SongDifficulties
            difficulties={mapset?.preview.difficulties ?? [{ name: map.meta.version }]}
            picked={mapset?.pickedName ?? map.meta.version}
            creator={map.meta.creator}
            onPick={(name) => void loader.pickDifficulty(name)}
          />
        </SetPanel>
      )}
      {visibleStarters.map((song) => (
        <StarterSetPanel
          key={song.id}
          map={song}
          selected={selectedKey === song.url}
          busy={loader.busyUrl === song.url}
          disabled={loader.busyUrl !== null}
          stars={dots(song.url)}
          onPick={() => void loader.pickBundled(song)}
        >
          {expanded(song.url)}
        </StarterSetPanel>
      ))}
      {visibleLibrary.map((entry) => {
        const key = `library:${entry.id}`;
        return (
          <LibrarySetPanel
            key={entry.id}
            entry={entry}
            selected={selectedKey === key}
            busy={loader.busyUrl === key}
            disabled={loader.busyUrl !== null}
            stars={dots(key)}
            onOpen={() => {
              void library.open(entry.id).then((bytes) => {
                if (bytes) void loader.openMapset(bytes, entry.label, key);
              });
            }}
            onRemove={() => void library.remove(entry.id)}
          >
            {expanded(key)}
          </LibrarySetPanel>
        );
      })}
      {!visibleStarters.length && !visibleLibrary.length && (
        <p className="lazer-empty">No beatmaps match “{search}”.</p>
      )}
      {library.unavailable && (
        <p className="lazer-empty">Browser storage unavailable — imports won't persist.</p>
      )}
    </div>
  );
}
