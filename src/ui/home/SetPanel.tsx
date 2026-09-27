import type { CSSProperties, ReactNode } from 'react';
import type { StarterMap } from '../../beatmap/starterMaps';
import { ChevronRightIcon } from '../shared/icons';
import { useObjectUrl } from '../useObjectUrl';
import { starColor } from './starColor';
import { useSongBackground } from './useSongBackground';

export interface SetPanelProps {
  title: string;
  artist: string;
  badge: string;
  background?: string;
  selected: boolean;
  busy?: boolean;
  disabled?: boolean;
  /** star ratings shown as coloured dots once the set's difficulties are known */
  stars?: number[];
  onPick: () => void;
  children?: ReactNode;
}

/** A beatmap set in the carousel: artwork, title, artist, status badge, difficulty dots. */
export function SetPanel({
  title,
  artist,
  badge,
  background,
  selected,
  busy,
  disabled,
  stars,
  onPick,
  children,
}: SetPanelProps) {
  return (
    <div className={`set-panel${selected ? ' is-selected' : ''}${busy ? ' is-busy' : ''}`}>
      <button
        className="set-panel__face"
        onClick={onPick}
        disabled={disabled}
        aria-pressed={selected}
        style={background ? ({ '--set-bg': `url("${background}")` } as CSSProperties) : undefined}
      >
        {selected && (
          <span className="set-panel__chevron" aria-hidden="true">
            <ChevronRightIcon size={16} />
          </span>
        )}
        <span className="set-panel__copy">
          <strong>{title}</strong>
          <small>{artist}</small>
          <span className="set-panel__tags">
            <span className="set-panel__badge">{badge}</span>
            {stars?.map((value, index) => (
              <i key={index} style={{ background: starColor(value) }} />
            ))}
          </span>
        </span>
      </button>
      {children}
    </div>
  );
}

/** Bundled starter map; artwork comes from the build-time extract, else from the archive. */
export function StarterSetPanel({
  map,
  ...props
}: { map: StarterMap } & Omit<SetPanelProps, 'title' | 'artist' | 'badge' | 'background'>) {
  const fallback = useObjectUrl(useSongBackground(map));
  return (
    <SetPanel
      {...props}
      title={map.title}
      artist={map.artist}
      badge="starter"
      background={map.backgroundUrl ?? fallback}
    />
  );
}
