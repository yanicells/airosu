import { useState } from 'react';
import type { useLibrary } from './useLibrary';

function fmtSize(bytes: number): string {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** Persisted uploads under the drop zone; click to reopen, ✕ to delete. */
export function YourMaps({
  library,
  onOpen,
}: {
  library: ReturnType<typeof useLibrary>;
  onOpen: (bytes: Uint8Array, label: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<string>();

  if (library.unavailable) {
    return (
      <p className="yourmaps__warning">browser storage unavailable — uploads won't persist</p>
    );
  }
  if (library.entries.length === 0) return null;

  return (
    <div className="yourmaps">
      <p className="eyebrow" style={{ margin: '0 0 2px' }}>
        your maps
      </p>
      {library.entries.map((entry) => (
        <div key={entry.id} className="panel yourmaps__row">
          <button
            className="yourmaps__open"
            disabled={pendingDelete === entry.id}
            onClick={() => {
              void library.open(entry.id).then((bytes) => {
                if (bytes) onOpen(bytes, entry.label);
              });
            }}
          >
            <span className="yourmaps__label">{entry.label}</span>
            <span className="yourmaps__meta">
              {entry.difficultyCount} difficult{entry.difficultyCount === 1 ? 'y' : 'ies'} ·{' '}
              {fmtSize(entry.byteLength)} · {new Date(entry.addedAt).toLocaleDateString()}
            </span>
          </button>
          {pendingDelete === entry.id ? (
            <div className="yourmaps__confirm" role="group" aria-label={`Remove ${entry.label}?`}>
              <span>Remove?</span>
              <button
                type="button"
                className="yourmaps__confirm-remove"
                onClick={() => {
                  setPendingDelete(undefined);
                  void library.remove(entry.id);
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className="yourmaps__confirm-cancel"
                onClick={() => setPendingDelete(undefined)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="yourmaps__delete"
              aria-label={`Remove ${entry.label} from your maps`}
              onClick={() => setPendingDelete(entry.id)}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
