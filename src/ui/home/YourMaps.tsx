import { useState, type ReactNode } from 'react';
import type { LibraryEntry } from '../../beatmap/library';
import { SetPanel } from './SetPanel';

function fmtSize(bytes: number): string {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** An imported .osz from browser storage, shown as a carousel set with a remove control. */
export function LibrarySetPanel({
  entry,
  selected,
  busy,
  disabled,
  stars,
  onOpen,
  onRemove,
  children,
}: {
  entry: LibraryEntry;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
  stars?: number[];
  onOpen: () => void;
  onRemove: () => void;
  children?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="library-set">
      <SetPanel
        title={entry.label}
        artist={`${entry.difficultyCount} difficult${entry.difficultyCount === 1 ? 'y' : 'ies'} · ${fmtSize(entry.byteLength)} · added ${new Date(entry.addedAt).toLocaleDateString()}`}
        badge="imported"
        selected={selected}
        busy={busy}
        disabled={disabled || confirming}
        stars={stars}
        onPick={onOpen}
      >
        {children}
      </SetPanel>
      {confirming ? (
        <div className="library-set__confirm" role="group" aria-label={`Remove ${entry.label}?`}>
          <span>Remove?</span>
          <button type="button" className="is-danger" onClick={onRemove}>
            Yes
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="library-set__remove"
          aria-label={`Remove ${entry.label} from your maps`}
          onClick={() => setConfirming(true)}
        >
          ✕
        </button>
      )}
    </div>
  );
}
