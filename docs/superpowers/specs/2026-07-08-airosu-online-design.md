# airosu online — accounts, scores, leaderboards, profiles

Date: 2026-07-08
Status: approved design for v2 ("airosu online")

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
| Auth | Convex Auth (`@convex-dev/auth`) with the **built-in Auth.js osu! provider** (`@auth/core/providers/osu`), osu! OAuth as the **only** sign-in method | osu! supports standard OAuth2 authorization-code grant (server-side client secret, refresh tokens, no PKCE). Auth.js ships an osu! provider, so Convex Auth needs near-zero custom code, runs entirely inside Convex (no Clerk/paid service), and works with a Vite SPA. Caveat: osu! does not return an email — acceptable, accounts key off osu! user id. |
| Full auth platform (Clerk etc.)? | No | One role (player), one provider, no admin tiers planned. |
| User's osu! tokens | **Not stored.** Profile is captured at sign-in; ongoing osu! stat sync uses the app's own client-credentials token (`public` scope) via `GET /users/{id}` | Avoids token refresh/rotation complexity entirely; public scope reads any user's public stats. |
| Map identity | MD5 checksum of the `.osu` file text (osu!'s own canonical map identifier), plus `beatmapId`/`beatmapSetId` from the file metadata when present | Checksum works for every map including edited/unsubmitted ones; osu! API supports `GET /beatmaps/lookup?checksum=…`. |
| Map content in DB | Metadata + difficulty attributes + the raw `.osu` **text** (Convex file storage). **Never audio, never full .osz** | `.osu` text is small (~50–200 KB), enables future pp recalcs and server-side verification. Audio stays out (copyright rule in AGENTS.md). |
| Map files for playing | Stay client-side. Uploaded `.osz` bytes cached in **IndexedDB** ("Your maps" library) | User's choice ("local storage for now"). localStorage can't hold binaries; IndexedDB can. |
| pp authority | Server recomputes pp on submit from raw hit stats + stored map attributes, using the **same TypeScript formula module** the client uses for live pp | Convex runs TS, so `src/game/ppFormula.ts` is imported by both sides. Client never sends a pp number. |
| pp re-scaling | `PP_VERSION` constant + stored raw stats + stored map attributes + `@convex-dev/migrations` recalc runbook | Formula changes (the quality curve / handicap — the parts we've already tuned once) are recomputable from stored data alone, no map files needed. osu! does the same ("pp reworks" recalculate every score). |
| Ranked status | Best-effort enrichment from `GET /beatmaps/lookup` at map registration (badge + link). No gating of leaderboards on ranked status | Explicitly not forced (user's call). Lookup by checksum is cheap and official, so we do capture it. |
| Leaderboard math at scale | `@convex-dev/aggregate` component (`TableAggregate`), global + per-country namespaces | O(log n) rank/offset queries; the component's canonical example is literally a leaderboard. |
| Routing | `react-router` (library mode) + `vercel.json` SPA rewrite | Profile/leaderboard pages need shareable URLs; the existing screen-state machine stays as-is inside the home route. |
| Cheating | Basic server-side sanity checks only (stats vs. map object count / max combo). Client-reported stats are trusted beyond that | It's a fun webcam game; full anti-cheat is out of scope. Documented as a known limitation. |

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

- **users** (extends the auth users table): `osuId` (number, indexed, unique),
  `username`, `avatarUrl`, `countryCode`, `countryName`, denormalized
  `totalPp`, `playCount`, `hitAccuracy` (weighted-avg of top plays, osu!-style),
  `ppVersion` (version their totalPp was computed with), and cached real-osu!
  stats: `osuPp`, `osuGlobalRank`, `osuStatsSyncedAt`.
- **maps**: `md5` (indexed, unique), `title`, `artist`, `version`, `creator`,
  `starRating`, `maxCombo`, `objectCount`, `ssPp` (SS-FC lazer pp — the "map
  worth"), `attributesVersion` (osu-standard-stable major), `bpm`, `lengthMs`,
  `cs/ar/od/hp`, `osuFileId` (Convex storage id of the .osu text), enrichment:
  `osuBeatmapId?`, `osuBeatmapSetId?`, `rankedStatus?`
  (`ranked|approved|qualified|loved|graveyard|wip|pending|unknown`),
  `coverUrl?`, `officialStarRating?`.
- **scores**: `userId`, `mapId`, `count300/100/50/countMiss`, `maxCombo`,
  `score`, `accuracy`, `grade`, `pp`, `ppVersion`, `isBest` (best pp play by
  this user on this map), settings snapshot `inputMode` + `forgiveness`,
  `_creationTime` as play time. Indexes: `by_map_best` (mapId, isBest, pp),
  `by_user_best` (userId, isBest, pp), `by_user_time` (userId).
- **aggregates** (`@convex-dev/aggregate`): `leaderboard` over users sorted by
  `-totalPp`, namespaced by `countryCode` plus a global namespace — gives
  rank(user), count, and offset-pagination for both global and country views.

## Flows

**Sign in**: navbar "sign in with osu!" → Convex Auth redirect to
`osu.ppy.sh/oauth/authorize` (scopes `identify public`) → callback on the
Convex site URL → profile callback maps osu! profile → users row
created/updated (osuId, username, avatar, country). No email involved.

**Register map** (first time anyone plays a given difficulty): client computes
md5 of the `.osu` text, calls `registerMap` action with the text. Server
re-parses it (osu-parsers + osu-standard-stable in a Node action), computes
`starRating`, `maxCombo`, `objectCount`, `ssPp` authoritatively, stores the
text in file storage, then best-effort osu! API lookup by checksum for
`rankedStatus`/ids/cover. Idempotent on md5.

**Submit score**: after a completed (non-quit) play while signed in, client
calls `submitScore` with `{ mapMd5, hit stats, score, settings snapshot }`.
Server validates (airosu emits exactly one judgment per hit object, so
count300+count100+count50+countMiss must equal the map's `objectCount`;
maxCombo ≤ objectCount; all counts ≥ 0), recomputes accuracy/grade/pp from stats + map attributes,
updates `isBest` flags, recomputes user's `totalPp`/`playCount`/`hitAccuracy`
(weighted 0.95ⁱ over top-100 best plays), updates the leaderboard aggregate.
Results screen shows "score submitted — personal best! +X pp" or sign-in
prompt for guests. Guests lose nothing else — game runs fully offline.

**Leaderboard page**: reactive query, page of 50; country filter (dropdown
from a static country list, defaulting to "Global"). Row: rank, flag, avatar,
username, accuracy, play count, pp. Click → profile.

**Profile page** `/u/:userId`: header (avatar, flag, username, global rank,
country rank, total pp) + "vs your real osu!" line (cached `osuPp`, refresh
action re-fetches via client-credentials, throttled to 1/day per user);
top plays list (map cover/title/difficulty, grade, accuracy, mods badge
showing inputMode/forgiveness if non-default, raw pp, weighted pp + weight %);
recent plays (last 20, any result). Own profile reachable from navbar.

**Local map library**: on `.osz` upload, bytes go into IndexedDB
(`airosu-library` DB via the `idb` package) keyed by content md5, with label +
difficulty count + added-at. Home screen gets a "your maps" section listing
them with a delete button; picking one loads from IndexedDB exactly like a
fresh upload. Storage errors (quota, private browsing) degrade to today's
in-memory behavior with a toast.

**pp rework runbook** (when the formula changes): bump `PP_VERSION` in
`src/game/ppFormula.ts`, deploy, run the `recalcPp` migration
(`@convex-dev/migrations`): recompute `scores.pp` from stored stats + map
attributes, recompute `isBest` per (user, map), then recompute every user's
`totalPp`/`hitAccuracy` and repair the aggregate. Scores store `ppVersion` so a
partially-run migration is resumable and auditable.

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
values at PP_VERSION 1... n), weighted-total math, submission validators, md5
helper, IndexedDB library module (with `fake-indexeddb`). Convex functions get
unit tests via `convex-test`. UI (navbar, profile, leaderboard) verified
manually via `pnpm run dev` per project convention.

## Out of scope (explicitly)

- Real anti-cheat / replay verification, friends, medals, rank history graphs,
  multiple game modes, admin roles, email/password auth, uploading audio or
  .osz to the server, gating leaderboards by ranked status.
