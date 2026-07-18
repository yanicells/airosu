# airosu online — accounts, scores, leaderboards, profiles

Date: 2026-07-08
Last reviewed: 2026-07-19
Status: approved design for v2 ("airosu online"), revised after repo/API audit

## Goal

Turn airosu from a single-session toy into a game people come back to: sign in
with osu!, submit plays, climb a global pp leaderboard, and show off a profile
with top plays — modeled on the osu! website (rankings page + user profile
page). Also persist uploaded maps locally so a player's library survives
reloads.

## Decisions (settled)

| Question | Decision | Why |
|---|---|---|
| Database | Convex | User's choice. Realtime queries fit live leaderboards for free. |
| Auth | Convex Auth (`@convex-dev/auth`) with the **built-in Auth.js osu! provider** (`@auth/core/providers/osu`), osu! OAuth as the **only** sign-in method | osu! supports the OAuth2 authorization-code grant. Auth.js ships an osu! provider, so Convex Auth stays small, runs inside Convex (no Clerk/paid service), and works with a Vite SPA. Caveat: osu! does not return an email — acceptable, accounts key off osu! user id. Use separate osu! OAuth applications for development and production because each application has one callback URL. |
| Full auth platform (Clerk etc.)? | No | One role (player), one provider, no admin tiers planned. |
| User's osu! tokens | **Not retained by airosu.** Sign-in uses only the `identify` scope; profile data is captured during OAuth. Ongoing osu! stat sync uses the app's own client-credentials token (`public` scope) via `GET /users/{id}` | Avoids user-token refresh/rotation complexity; public scope reads public user stats. |
| Map identity | MD5 of the received `.osu` UTF-8 text, plus `beatmapId`/`beatmapSetId` from file metadata when present | The hash gives every exact difficulty/edit a stable local identity. Official enrichment prefers beatmap ID and falls back to osu!'s checksum lookup, avoiding newline/BOM normalization mismatches where possible. |
| Map content in DB | Metadata + difficulty attributes + the raw `.osu` **text** (Convex file storage). **Never audio, never full .osz** | `.osu` text is small (~50–200 KB), enables future pp recalcs and server-side verification. Audio stays out (copyright rule in AGENTS.md). |
| Map files for playing | Stay client-side. Uploaded `.osz` bytes cached in **IndexedDB** ("Your maps" library) | User's choice ("local storage for now"). localStorage can't hold binaries; IndexedDB can. |
| pp authority | Server recomputes pp on submit from raw hit stats + stored map attributes, using the **same TypeScript formula module** the client uses for live pp | Convex runs TS, so `src/game/ppFormula.ts` is imported by both sides. Client never sends a pp number. The stored map includes airosu's `judgmentCount`; a slider produces a head judgment and a final follow judgment, so this is not always the same as osu!'s hit-object count. |
| pp re-scaling | `PP_VERSION` for formula changes, `ATTRIBUTES_VERSION` for parser/difficulty-calculator changes, stored raw stats/map text, and a two-stage recalculation runbook | Formula-only changes replay from stored attributes. Parser or `osu-standard-stable` changes first refresh map attributes from stored `.osu` text, then replay every score. Both paths are resumable and auditable. |
| Ranked status | Best-effort enrichment from `GET /beatmaps/lookup` at map registration (badge + link). No gating of leaderboards on ranked status | Explicitly not forced (user's call). Lookup by checksum is cheap and official, so we do capture it. |
| Leaderboard math at scale | `@convex-dev/aggregate` component (`TableAggregate`), global + per-country namespaces | O(log n) rank/offset queries; the component's canonical example is literally a leaderboard. |
| Routing | `react-router` (library mode) + `vercel.json` SPA rewrite | Profile/leaderboard pages need shareable URLs; the existing screen-state machine stays as-is inside the home route. |
| Score retries | Every finished play gets a client-generated `playId`; `(userId, playId)` is unique on the server | React remounts, double clicks, timeouts, and retry buttons must return the original submission instead of adding duplicate plays or pp. |
| Leaderboard settings | Relax/manual and all allowed forgiveness values share one leaderboard; rows show non-default settings | This is a fun game, not a strict competitive ruleset. Splitting the small player pool is not useful yet, but the limitation stays visible. |
| Cheating | Authenticated map registration, size limits, strict value/range checks, and basic server-side score sanity checks. Client-reported play stats are trusted beyond that | It's a fun webcam game; full anti-cheat/replay verification is out of scope. |
| Production map assets | No bundled copyrighted `.osz` or audio in the production graph. Test fixtures stay on disk for Vitest only; production starts with upload/IndexedDB unless a clearly licensed demo map is added later | The current `import.meta.glob('/game-assets/maps/*.osz')` pulls local fixtures into `dist`, so this must be removed before online work ships. |

## What osu! itself does (reference for UX)

- **Rankings page**: performance (pp) ranking, filterable by country; columns:
  rank, flag + username, accuracy, play count, pp.
- **Profile page**: avatar, username, flag, global rank, country rank, total pp,
  play count, hit accuracy; **Top plays** ("Best performance") listing each
  play's map, mods, accuracy, raw pp and **weighted pp with the weight %**;
  **Recent plays**.
- **Weighted pp**: total pp = Σ (ppᵢ × 0.95ⁱ) over the player's best score per
  map, sorted descending. We copy this (top 100 plays counted, no bonus pp).
- **pp reworks**: when the formula changes, every score is recalculated and
  rankings shift. Our `PP_VERSION` + migration mirrors this.

## Architecture

```
Vite SPA (Vercel)                          Convex deployment
┌───────────────────────────┐              ┌──────────────────────────────┐
│ react-router              │              │ Convex Auth (osu! provider)  │
│  /            game flow   │◄─live query─►│ queries: leaderboard,        │
│  /leaderboard rankings    │              │   profile, mapScores         │
│  /u/:userId   profile     │              │ mutations: (internal only)   │
│                           │──action call─►│ actions: registerMap,       │
│ IndexedDB: your .osz maps │              │   submitScore, syncOsuStats  │
│ game engine (unchanged)   │              │ components: aggregate,       │
└───────────────────────────┘              │   migrations                 │
                                           └───────┬──────────────────────┘
                                                   │ client-credentials token
                                                   ▼
                                           osu! API v2 (lookup, users)
```

New top-level dirs: `convex/` (backend), `src/online/` (client helpers for
auth/submit), `src/ui/leaderboard/`, `src/ui/profile/`, `src/ui/nav/`,
`src/beatmap/library.ts` (IndexedDB).

## Data model (Convex schema)

Convex Auth's `authTables` plus:

- **users** (extends the auth users table): `osuId` (number, indexed; uniqueness
  comes from the linked osu! provider account),
  `username`, `avatarUrl`, `countryCode`, `countryName`, denormalized
  `totalPp`, `playCount`, `hitAccuracy` (weighted-avg of top plays, osu!-style),
  `ppVersion` (version their totalPp was computed with), and cached real-osu!
  stats: `osuPp`, `osuGlobalRank`, `osuStatsSyncedAt`.
- **maps**: `md5` (indexed, unique), `title`, `artist`, `version`, `creator`,
  `starRating`, `maxCombo`, `objectCount`, `judgmentCount`, `ssPp` (the full-map
  worth used by the current airosu formula), `attributesVersion`, `bpm`, `lengthMs`,
  `cs/ar/od/hp`, `osuFileId` (Convex storage id of the .osu text), enrichment:
  `osuBeatmapId?`, `osuBeatmapSetId?`, `rankedStatus?`
  (`ranked|approved|qualified|loved|graveyard|wip|pending|unknown`),
  `coverUrl?`, `officialStarRating?`.
- **scores**: `userId`, `mapId`, `playId` (idempotency key),
  `count300/100/50/countMiss`, `maxCombo`,
  `score`, `accuracy`, `grade`, `pp`, `ppVersion`, `isBest` (best pp play by
  this user on this map), settings snapshot `inputMode` + `forgiveness`,
  `_creationTime` as play time. Indexes: `by_user_play` (userId, playId),
  `by_user_map_pp` (userId, mapId, pp), `by_map_best` (mapId, isBest, pp),
  `by_user_best` (userId, isBest, pp), `by_user_time` (userId).
- **aggregates** (`@convex-dev/aggregate`): `leaderboard` over users sorted by
  `-totalPp`, namespaced by `countryCode` plus a global namespace — gives
  rank(user), count, and offset-pagination for both global and country views.

## Privacy and data boundary

- Camera frames and `.osz`/audio bytes stay in the browser.
- Convex stores the public osu! identity fields needed for profiles, `.osu`
  difficulty text, score statistics, and the input/forgiveness snapshot.
- Profiles and submitted plays are public. The README must say this plainly
  before production launch.
- airosu does not keep the user's osu! access/refresh token or request email.

## Flows

**Sign in**: navbar "sign in with osu!" → Convex Auth redirect to
`osu.ppy.sh/oauth/authorize` (scope `identify`) → callback on the
Convex site URL → profile callback maps osu! profile → users row
created/updated (osuId, username, avatar, country). No email involved.

**Register map** (first completed signed-in play of a difficulty): client calls
`registerMap` with the `.osu` text. The action requires authentication and
rejects text above 1 MB. Server hashes and re-parses it (osu-parsers +
osu-standard-stable in a Node action), computes `starRating`, `maxCombo`,
`objectCount`, airosu `judgmentCount`, `ssPp`, and `attributesVersion`, stores
the text in file storage, then performs best-effort osu! API lookup (beatmap ID
first, checksum fallback) for status/ids/cover. Registration is idempotent by
md5 and cleans up any storage blob lost to a concurrent registration race.

**Submit score**: after a completed (non-quit) play while signed in, client
calls `submitScore` with `{ playId, mapId, hit stats, score, settings snapshot }`.
Server first returns the existing row for a repeated `(userId, playId)`. For a
new play it validates safe integer counts/score, known input mode, allowed
forgiveness range, judgment total equal to `judgmentCount`, and
`maxCombo ≤ judgmentCount`; then it recomputes accuracy/grade/pp from stats + map attributes,
updates `isBest` flags, recomputes user's `totalPp`/`playCount`/`hitAccuracy`
(weighted 0.95ⁱ over top-100 best plays), updates the leaderboard aggregate.
Results screen shows "score submitted — personal best! +X pp" or sign-in
prompt for guests. Guests lose nothing else — game runs fully offline.

**Leaderboard page**: reactive query, page of 50; country filter (dropdown of
countries seen among ranked players, defaulting to "Global"). Row: rank, flag, avatar,
username, accuracy, play count, pp. Click → profile.

**Profile page** `/u/:userId`: header (avatar, flag, username, global rank,
country rank, total pp) + "vs your real osu!" line (cached `osuPp`, refresh
action re-fetches via client-credentials, throttled to 1/day per user);
top plays list (map cover/title/difficulty, grade, accuracy, mods badge
showing inputMode/forgiveness if non-default, raw pp, weighted pp + weight %);
recent plays (last 20, any result). Own profile reachable from navbar.

**Local map library**: on `.osz` upload, bytes go into IndexedDB
(`airosu-library` DB via the `idb` package) keyed by SHA-256, with label,
difficulty count, byte size, and added-at. Home screen gets a "your maps" section listing
them with a delete button; picking one loads from IndexedDB exactly like a
fresh upload. Storage errors (quota, private browsing) degrade to today's
in-memory behavior with a toast.

**pp rework runbook**: for formula-only changes, bump `PP_VERSION`, deploy, and
run the score → best-flag → user-total migrations. If parser or difficulty
attributes change, also bump `ATTRIBUTES_VERSION`, run the resumable Node
attribute refresh over stored `.osu` files, then run the pp migrations. The
best-flag phase uses an indexed `(userId, mapId, pp)` lookup instead of loading
all of a user's scores into one transaction.

## pp formula refactor

`src/game/pp.ts` splits:

- `src/game/ppFormula.ts` — **pure, dependency-free**: `PP_VERSION`,
  `playQuality(stats)`, `handicap(starRating)`,
  `playPp({ssPp, starRating}, stats)`. Imported by the client's `PpCounter`
  and by `convex/` (shared module — Convex bundles it fine since it has no
  DOM/node deps).
- `PpCounter` keeps osu-standard-stable timed attributes for live pp, but
  delegates the final math to `ppFormula`.

The client model needs no new fields: `registerMap` receives the raw `.osu`
text and the server derives md5, beatmap ids, object count and attributes
itself (`src/beatmap/attributes.ts`, shared with tests).

## Error handling

- Convex unreachable / signed out → game is fully playable; submit UI shows
  retry or sign-in prompt; nothing blocks the play loop.
- `registerMap` osu! API enrichment failure → map saved with
  `rankedStatus: 'unknown'`, enrichment retried next registration attempt.
- osu! API rate limits (guideline 60 req/min): enrichment is once per new map,
  stat sync throttled per user — well under.
- Rejected submissions (sanity check fail) → score not stored, results screen
  shows "score could not be verified".

## Testing

TDD for pure logic: `ppFormula` (version bump invariants, parity with old
values at PP_VERSION 1... n), slider-aware judgment counts, weighted-total
math, submission validators, duplicate `playId` behavior, md5 helper, and the
IndexedDB library module (with `fake-indexeddb`). Convex functions get unit
tests via `convex-test`. UI (navbar, profile, leaderboard) verified
manually via `pnpm run dev` per project convention.

## Out of scope (explicitly)

- Real anti-cheat / replay verification, friends, medals, rank history graphs,
  multiple game modes, admin roles, email/password auth, uploading audio or
  .osz to the server, gating leaderboards by ranked status, separate
  leaderboards per input/forgiveness setting.
