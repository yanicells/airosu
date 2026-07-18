# airosu online — accounts, scores, leaderboards, profiles

Date: 2026-07-08
Last reviewed: 2026-07-19
Status: approved design for v2 ("airosu online"), revised after repo/API audit

## Goal

Turn airosu from a single-session toy into a game people come back to: sign in
with osu!, submit plays, climb a global pp leaderboard, and show off a profile
with top plays — modeled on the osu! website (rankings page + user profile
page). Also ship a small licensed starter library, support guided imports from
osu! website URLs, persist uploaded maps locally, and let the player aim with
either their palm or index fingertip.

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
| Starter maps | Ship 2–3 short, beginner-friendly `.osz` files only when audio, background, hitsounds, and beatmap redistribution are explicitly permitted for airosu. Keep a machine-readable license manifest and a 15 MB total budget | New players can play immediately, but being downloadable from osu! or listed as a Featured Artist track does not by itself prove third-party redistribution rights. Existing mainstream-song fixtures remain test-only unless separate permission is documented. |
| osu! URL import | Accept canonical osu! beatmap/beatmapset URLs, resolve metadata through API v2, then guide the user to the official osu! page/download and back to the existing `.osz` file picker | The official beatmapset download API is marked `lazer`, and osu! states `lazer` routes are unavailable to normal authorization-code or client-credentials apps. No mirrors, scraping, cookies, or hidden token flow. Keep the acquisition adapter ready if osu! exposes supported downloads later. |
| Cursor anchor | `palm` (default) or index fingertip (MediaPipe landmark 8), selected on the map card before calibration and also available in Settings | Palm remains stable and forgiving; fingertip gives more precise aiming. The same calibration/filter pipeline handles both. Changing anchor before play requires a fresh calibration. |
| pp authority | Preserve the existing hybrid formula: osu!lazer-derived SS map worth from `osu-standard-stable`, multiplied by airosu's accuracy/combo quality curve and difficulty-dependent computer-vision handicap (`2 + 30 × e^-stars`) | airosu is much harder than mouse osu!, especially on low-star maps. The server uses the same pure TypeScript formula as the live client and never accepts client pp. Golden tests freeze current PP v1 values before refactoring. The stored map includes airosu's `judgmentCount`; sliders emit a head and final follow judgment. |
| pp re-scaling | `PP_VERSION` for formula changes, `ATTRIBUTES_VERSION` for parser/difficulty-calculator changes, stored raw stats/map text, and a two-stage recalculation runbook | Formula-only changes replay from stored attributes. Parser or `osu-standard-stable` changes first refresh map attributes from stored `.osu` text, then replay every score. Both paths are resumable and auditable. |
| Ranked status | Best-effort enrichment from `GET /beatmaps/lookup` at map registration (badge + link). No gating of leaderboards on ranked status | Explicitly not forced (user's call). Lookup by checksum is cheap and official, so we do capture it. |
| Leaderboard math at scale | `@convex-dev/aggregate` component (`TableAggregate`), global + per-country namespaces | O(log n) rank/offset queries; the component's canonical example is literally a leaderboard. |
| Routing | `react-router` (library mode) + `vercel.json` SPA rewrite | Profile/leaderboard pages need shareable URLs; the existing screen-state machine stays as-is inside the home route. |
| Score retries | Every finished play gets a client-generated `playId`; `(userId, playId)` is unique on the server | React remounts, double clicks, timeouts, and retry buttons must return the original submission instead of adding duplicate plays or pp. |
| Leaderboard settings | Relax/manual, palm/index, and all allowed forgiveness values share one leaderboard; rows show non-default settings | This is a fun game, not a strict competitive ruleset. Splitting the small player pool is not useful yet, but the limitation stays visible. |
| Cheating | Authenticated map registration, size limits, strict value/range checks, and basic server-side score sanity checks. Client-reported play stats are trusted beyond that | It's a fun webcam game; full anti-cheat/replay verification is out of scope. |
| Production map assets | Only manifest-approved starter maps enter the Vite production graph. Other `.osz` files stay under a test-only directory read through `node:fs` | The current broad `import.meta.glob('/game-assets/maps/*.osz')` indiscriminately ships every fixture. Replace it with a narrow licensed-starter path and fail CI if an unlisted file or hash appears. |

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
│ licensed starter maps     │              │   submitScore, syncOsuStats, │
│ IndexedDB: your .osz maps │──action call─►│   resolveOsuUrl              │
│ game engine (unchanged)   │              │ components: aggregate,       │
└───────────────────────────┘              │   migrations                 │
                                           └───────┬──────────────────────┘
                                                   │ client-credentials token
                                                   ▼
                                           osu! API v2 (lookup, users)
```

New top-level dirs: `convex/` (backend), `src/online/` (client helpers for
auth/submit and URL resolution), `src/ui/leaderboard/`, `src/ui/profile/`,
`src/ui/nav/`, `src/beatmap/acquisition/`, and `src/beatmap/library.ts`
(IndexedDB).

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
  this user on this map), settings snapshot `inputMode` + `forgiveness` +
  `cursorAnchor` (`palm|index`),
  `_creationTime` as play time. Indexes: `by_user_play` (userId, playId),
  `by_user_map_pp` (userId, mapId, pp), `by_map_best` (mapId, isBest, pp),
  `by_user_best` (userId, isBest, pp), `by_user_time` (userId).
- **aggregates** (`@convex-dev/aggregate`): `leaderboard` over users sorted by
  `-totalPp`, namespaced by `countryCode` plus a global namespace — gives
  rank(user), count, and offset-pagination for both global and country views.

## Privacy and data boundary

- Camera frames and `.osz`/audio bytes stay in the browser.
- Convex stores the public osu! identity fields needed for profiles, `.osu`
  difficulty text, score statistics, and the input/forgiveness/cursor snapshot.
- Profiles and submitted plays are public. The README must say this plainly
  before production launch.
- airosu does not keep the user's osu! access/refresh token or request email.

## Flows

**Sign in**: navbar "sign in with osu!" → Convex Auth redirect to
`osu.ppy.sh/oauth/authorize` (scope `identify`) → callback on the
Convex site URL → profile callback maps osu! profile → users row
created/updated (osuId, username, avatar, country). No email involved.

**Starter maps**: home loads `game-assets/starter-maps/manifest.json`, whose
entries include file, SHA-256, size, title/artist, license, source, attribution,
and redistribution evidence. Only listed files are imported by Vite. Selection
opens the existing difficulty picker without IndexedDB. A verification script
checks hashes, required rights metadata, allowed extensions, no video, and the
15 MB total budget during CI/build.

**osu! URL-assisted import**: paste a canonical `osu.ppy.sh/beatmapsets/{id}`
or `osu.ppy.sh/beatmaps/{id}` URL → pure parser extracts the ID → Convex action
uses the app's `public` client-credentials token to fetch beatmap/beatmapset
metadata → UI shows the exact title/cover/status and an "Open on osu! to
download" button → user chooses or drops the downloaded `.osz` → existing
loader saves it to IndexedDB. The browser never claims to auto-download or
auto-read the Downloads folder. Official limitation:
<https://osu.ppy.sh/docs/#beatmapsetsbeatmapsetdownload>.

**Register map** (first completed signed-in play of a difficulty): client calls
`registerMap` with the `.osu` text. The action requires authentication and
rejects text above 1 MB. Server hashes and re-parses it (osu-parsers +
osu-standard-stable in a Node action), computes `starRating`, `maxCombo`,
`objectCount`, airosu `judgmentCount`, `ssPp`, and `attributesVersion`, stores
the text in file storage, then performs best-effort osu! API lookup (beatmap ID
first, checksum fallback) for status/ids/cover. Registration is idempotent by
md5 and cleans up any storage blob lost to a concurrent registration race.

**Submit score**: after a completed (non-quit) play while signed in, client
calls `submitScore` with `{ playId, mapId, hit stats, score, inputMode,
forgiveness, cursorAnchor }`.
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
showing inputMode/forgiveness/cursor anchor if non-default, raw pp, weighted pp,
and weight %);
recent plays (last 20, any result). Own profile reachable from navbar.

**Local map library**: on `.osz` upload, bytes go into IndexedDB
(`airosu-library` DB via the `idb` package) keyed by SHA-256, with label,
difficulty count, byte size, and added-at. Home screen gets a "your maps" section listing
them with a delete button; picking one loads from IndexedDB exactly like a
fresh upload. Storage errors (quota, private browsing) degrade to today's
in-memory behavior with a toast.

**Cursor anchor**: `Settings.cursorAnchor` defaults to `palm`. The map card
shows Palm / Index fingertip beside input/visual mode. Calibration samples the
selected point; the cursor source calls a pure `cursorPoint(landmarks, anchor)`
function before calibration mapping and One Euro filtering. If the anchor is
changed after calibration, route back through calibration before play. Index
mode uses landmark 8 and the existing smoothing control; no gesture clicking.

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

PP v1 is a compatibility contract, not a redesign. Before extraction, record
golden results from the current implementation: approximately
`42.2639525071pp` for a perfect airosu-judgment play on Kira Kira Days
`Rocket's Easy!!`, `347.7766436448pp` on `Mamayu's Insane!!`, and
`13.4013076252pp` for the existing real hand-tracked quaver Beginner sample.
Refactoring must match within floating-point tolerance. Palm and index plays
use the same PP v1 formula; `cursorAnchor` is stored so a future version can
deliberately change that policy and recalculate scores.

## Error handling

- Convex unreachable / signed out → game is fully playable; submit UI shows
  retry or sign-in prompt; nothing blocks the play loop.
- `registerMap` osu! API enrichment failure → map saved with
  `rankedStatus: 'unknown'`, enrichment retried next registration attempt.
- Invalid/unsupported osu! URL → explain accepted canonical formats. Metadata
  failure leaves local upload and starter maps available. Never fall back to a
  mirror.
- Starter manifest/hash/license check failure → fail CI/build; do not silently
  omit or ship an unverified file.
- osu! API rate limits (guideline 60 req/min): enrichment is once per new map,
  stat sync throttled per user — well under.
- Rejected submissions (sanity check fail) → score not stored, results screen
  shows "score could not be verified".

## Testing

TDD for pure logic: `ppFormula` (golden PP v1 compatibility and version bump
invariants), slider-aware judgment counts, `cursorPoint` palm/index selection,
osu! URL parsing, starter-manifest validation, weighted-total math, submission
validators, duplicate `playId` behavior, md5 helper, and the IndexedDB library
module (with `fake-indexeddb`). Convex functions get unit tests via
`convex-test`. UI (navbar, URL import, profile, leaderboard) verified
manually via `pnpm run dev` per project convention.

## Out of scope (explicitly)

- Real anti-cheat / replay verification, friends, medals, rank history graphs,
  multiple game modes, admin roles, email/password auth, uploading audio or
  .osz to the server, gating leaderboards by ranked status, separate
  leaderboards per input/forgiveness/cursor setting.
- Automatic beatmap downloading from osu!, mirrors, scraping, browser-cookie
  forwarding, storing osu! user tokens, or reading the user's Downloads folder.
