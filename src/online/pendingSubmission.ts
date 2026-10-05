import type { LastResult } from '../ui/appState';

/** The parts of a finished play the server needs to register its map and score it. */
export type SubmittedPlay = Pick<
  LastResult,
  'playId' | 'score' | 'maxCombo' | 'counts' | 'inputMode' | 'forgiveness' | 'cursorAnchor'
>;

export interface PendingSubmission {
  /** raw .osu text; registerMap identifies the difficulty by its md5 */
  osuText: string;
  play: SubmittedPlay;
}

interface Stored extends PendingSubmission {
  version: 1;
  savedAt: number;
}

const KEY = 'airosu.pendingSubmission';
/** a guest who wanders off mid sign-in shouldn't submit an old play much later */
export const PENDING_TTL_MS = 30 * 60 * 1000;

/** Score mutation arguments for a play on a registered map. */
export function scoreArgs<MapId>(play: SubmittedPlay, mapId: MapId) {
  return {
    playId: play.playId,
    mapId,
    count300: play.counts[300],
    count100: play.counts[100],
    count50: play.counts[50],
    countMiss: play.counts[0],
    maxCombo: play.maxCombo,
    score: play.score,
    inputMode: play.inputMode,
    forgiveness: play.forgiveness,
    cursorAnchor: play.cursorAnchor,
  };
}

/** Remembers a guest's play across the full-page osu! OAuth redirect. */
export function savePendingSubmission(pending: PendingSubmission, now = Date.now()): void {
  const { playId, score, maxCombo, counts, inputMode, forgiveness, cursorAnchor } = pending.play;
  const stored: Stored = {
    version: 1,
    savedAt: now,
    osuText: pending.osuText,
    play: { playId, score, maxCombo, counts, inputMode, forgiveness, cursorAnchor },
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // storage full or unavailable: the play just can't survive the redirect
  }
}

export function clearPendingSubmission(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** The saved play if it is recent and well-formed; anything else is dropped. */
export function readPendingSubmission(now = Date.now()): PendingSubmission | null {
  let stored: Partial<Stored> | null;
  try {
    stored = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Partial<Stored> | null;
  } catch {
    stored = null;
  }
  if (!stored) return null;
  const play = stored.play;
  const valid =
    stored.version === 1 &&
    typeof stored.savedAt === 'number' &&
    now - stored.savedAt < PENDING_TTL_MS &&
    typeof stored.osuText === 'string' &&
    play &&
    typeof play.playId === 'string' &&
    isCount(play.score) &&
    isCount(play.maxCombo) &&
    play.counts &&
    [300, 100, 50, 0].every((j) => isCount(play.counts[j as 300 | 100 | 50 | 0])) &&
    (play.inputMode === 'relax' || play.inputMode === 'manual') &&
    typeof play.forgiveness === 'number' &&
    (play.cursorAnchor === 'palm' || play.cursorAnchor === 'index');
  if (!valid) {
    clearPendingSubmission();
    return null;
  }
  return { osuText: stored.osuText!, play: play! };
}
