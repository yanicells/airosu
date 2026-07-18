# airosu online (v2) Implementation Plan

**Last reviewed:** 2026-07-19 — revised against the current repo, current package APIs, and the approved design.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** licensed starter maps, palm/index-finger aiming, osu! URL-assisted import, osu! sign-in, server-validated scores with authoritative airosu-scaled pp, global/country leaderboards, profiles, and a persistent local map library.

**Architecture:** A manifest-approved starter pack is bundled client-side; other `.osz` files are local uploads cached in IndexedDB. Palm/index selection feeds the existing calibration and One Euro filter pipeline. Convex provides osu!-only auth, URL metadata resolution, map registration, score submission, profiles, and aggregate leaderboards; it never stores audio or `.osz`. PP keeps the existing osu!lazer map-worth calculation plus airosu's computer-vision quality/handicap scaling, shared by client and server and protected by `PP_VERSION`/`ATTRIBUTES_VERSION` migrations.

**Tech Stack:** Vite + React 19 + TypeScript, MediaPipe HandLandmarker, Convex, `@convex-dev/auth` + `@auth/core` (osu! provider), `@convex-dev/aggregate`, `@convex-dev/migrations`, `react-router` (library mode), `idb`, `fflate`, osu-parsers/osu-standard-stable, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-08-airosu-online-design.md`

## Global Constraints

- pnpm always — never npm or yarn. Use `pnpm add`, `pnpm dlx`, `pnpm test`.
- TypeScript everywhere. Feature folders under `src/ui/<screen>/` with an `index.ts` barrel; split components past ~150 lines.
- TDD for all pure logic. UI verified manually via `pnpm run dev`.
- Conventional commits. Commit after every green test cycle.
- Stacked PRs: one branch + PR per milestone, each branched from the previous (`v1.4-onboarding` → `v2.0-online-auth` → `v2.1-scores` → `v2.2-leaderboard` → `v2.3-profile` → `v2.4-map-library`).
- Ship only starter `.osz` assets with explicit airosu redistribution rights and a verified manifest. Never ship unapproved fixtures. Never upload audio or `.osz` bytes to Convex — only `.osu` **text**.
- Never add Vercel deploy automation. Production deploy notes are documentation only.
- Verify installed package APIs at install time; if reality differs from this plan (Convex Auth, aggregate, migrations APIs move), **trust the installed library**, adapt, and note the deviation in the PR description.
- Use the installed `vercel-react-best-practices` skill when writing React/TSX and `frontend-design` for UI polish. For Convex Auth, aggregate, and migrations, follow the installed package README/types and the official Convex docs; do not assume optional `convex-*` skills are installed.
- The game must remain fully playable signed-out and offline. No online call may block the play loop.
- Map registration requires a signed-in user, accepts at most 1 MB of UTF-8 `.osu` text, and must never upload audio or `.osz` bytes.
- Production `.osz` files may come only from `game-assets/starter-maps/manifest.json`, must match its SHA-256 and size, contain no video, and total at most 15 MB. Files under `game-assets/test-maps/` are test-only.
- Relax/manual, palm/index, and forgiveness values 1.0–2.5 share one leaderboard in v2; non-default settings are visible on play rows. Separate competitive rulesets are out of scope.
- Preserve PP v1 exactly: official osu!lazer-derived map worth, airosu accuracy/combo quality, and the existing low-star computer-vision handicap. Cursor anchor does not change PP in v2.
- osu! URL import uses documented API v2 metadata only. Do not use mirrors, scrape website HTML, forward browser cookies, retain osu! user tokens, or claim automatic download support.

## Official references

- osu! OAuth grants/scopes and the statement that `lazer` routes are unavailable to third-party authorization-code/client-credentials apps: <https://osu.ppy.sh/docs/#authentication>
- Beatmapset download endpoint (`lazer`, therefore not usable here): <https://osu.ppy.sh/docs/#beatmapsetsbeatmapsetdownload>
- Content permission guidance: <https://osu.ppy.sh/wiki/en/Rules/Content_usage_permissions>
- Featured Artist licensing scope and contact: <https://osu.ppy.sh/legal/en/Music_licensing>
- MediaPipe landmark 8 is the index fingertip: <https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker>

## Human prerequisites (repo owner — do these before/during Milestones 0–1)

1. **Convex project**: run `pnpm dlx convex dev` once and complete the interactive login/project creation. This writes `CONVEX_DEPLOYMENT` to `.env.local` and prints the deployment URL (`https://<name>.convex.cloud`) and site URL (`https://<name>.convex.site`).
2. **Development osu! OAuth client**: at <https://osu.ppy.sh/home/account/edit#oauth> click "New OAuth Application". Name: `airosu dev`. Application Callback URL: `https://<dev-name>.convex.site/api/auth/callback/osu`. Save the Client ID and Client Secret. An osu! OAuth application has one callback URL, so do not reuse this client for production.
3. **Convex env vars** (dev deployment): 
   ```bash
   pnpm dlx convex env set AUTH_OSU_ID <client id>
   pnpm dlx convex env set AUTH_OSU_SECRET <client secret>
   pnpm dlx convex env set SITE_URL http://localhost:5173
   ```
4. **Production checklist** (later, manual, no automation): create the production Convex deployment, create a second osu! OAuth application named `airosu` whose callback is `https://<prod-name>.convex.site/api/auth/callback/osu`, set that client's `AUTH_OSU_ID`/`AUTH_OSU_SECRET` plus `SITE_URL=https://airosu.ycells.com` on the production deployment, and set `VITE_CONVEX_URL` in Vercel project settings to the production deployment URL.
5. **Starter-map rights**: provide 2–3 playable `.osz` files, each 60–150 seconds with at least an Easy/Normal difficulty and no video. For every audio, background, hitsound, and beatmap, provide a license or direct permission that explicitly allows redistribution in airosu. An osu! download page or Featured Artist listing alone is not sufficient evidence for third-party bundling.

---

# Milestone 0 — Licensed starter maps + cursor choice (branch `v1.4-onboarding`, PR base `main`)

### Task 0.1: Licensed starter-map manifest and production boundary

**Files:**
- Create: `game-assets/starter-maps/manifest.json`, `game-assets/starter-maps/LICENSES/`, `scripts/verify-starter-maps.mjs`, `src/beatmap/starterMaps.ts`, `src/beatmap/starterMaps.test.ts`
- Move: current `game-assets/maps/*.osz` → `game-assets/test-maps/*.osz` unless an item has the prerequisite's explicit redistribution evidence
- Modify: fixture paths in `src/beatmap/*.test.ts` and `src/game/pp.test.ts`; `src/beatmap/bundled.ts`; `src/ui/home/MapLoadScreen.tsx`; `package.json`; `.github/workflows/ci.yml`
- Delete: `src/beatmap/bundled.test.ts` (filename parsing is replaced by manifest validation)

**Interfaces:**
- Produces `StarterMapEntry = { id, artist, title, file, sha256, byteLength, license, sourceUrl, attribution, evidence }`, `StarterMap = StarterMapEntry & { url: string }`, and `starterMaps(): StarterMap[]`.
- Only `game-assets/starter-maps/*.osz` is reachable from the Vite production graph. `game-assets/test-maps/` is read only by Vitest through `node:fs`.

- [ ] **Step 1: Separate test fixtures** — move all current mainstream-song `.osz` files to `game-assets/test-maps/`; update every `readFileSync('game-assets/maps/...')` test path. Do not place either test or starter maps in `public/`.

- [ ] **Step 2: Add the rights manifest** — for each Human prerequisite 5
asset, add its `.osz`, a local evidence file under `LICENSES/`, and one JSON
entry matching this exact schema:

```ts
interface StarterManifest {
  version: 1;
  maps: Array<{
    id: string;          // unique lowercase slug: /^[a-z0-9-]+$/
    artist: string;
    title: string;
    file: string;        // same slug + .osz
    sha256: string;      // computed lowercase SHA-256
    byteLength: number;  // exact on-disk byte length
    license: string;     // exact license/direct-permission name
    sourceUrl: string;   // HTTPS rights/source page
    attribution: string; // exact required credit
    evidence: string;    // LICENSES/<same-slug>.md
  }>;
}
```

Use the prerequisite's exact values and computed hash/size; do not commit a
starter map without all fields and human-reviewed evidence. Keep 2–3 maps,
60–150 seconds each, with at least Easy/Normal, no video, and ≤15 MB total.

- [ ] **Step 3: Write the failing manifest test** — `starterMaps.test.ts` loads the JSON and asserts unique IDs/files, 64-character SHA-256 values, positive byte sizes, HTTPS source URLs, non-empty attribution/license/evidence, 2–3 entries, and total `byteLength <= 15_000_000`. Run `pnpm test src/beatmap/starterMaps.test.ts` → FAIL until loader/manifest validation exists.

- [ ] **Step 4: Implement and verify assets** — `starterMaps.ts` imports the JSON and uses a narrow eager glob:

```ts
const starterUrls = import.meta.glob('/game-assets/starter-maps/*.osz', {
  query: '?url', import: 'default', eager: true,
}) as Record<string, string>;
```

Map manifest filenames to these URLs; throw if a listed file is absent or an unlisted `.osz` appears. Move the `BundledMap` type to `starterMaps.ts`; make `bundled.ts` a compatibility barrel that exports `type BundledMap = StarterMap` and `starterMaps as bundledMaps`, so existing home components need minimal changes and there is no circular import. `scripts/verify-starter-maps.mjs` reads each file, checks SHA-256/size/evidence, uses `fflate.unzipSync` to reject `.mp4`, `.avi`, `.flv`, `.mov`, or `.webm`, confirms at least one `.osu` file, and enforces the 15 MB total. Add `"verify:starter-maps": "node scripts/verify-starter-maps.mjs"` and run it in CI before build.

```js
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'game-assets/starter-maps');
const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
const fail = (message) => { throw new Error(`starter maps: ${message}`); };
if (manifest.version !== 1 || !Array.isArray(manifest.maps)) fail('invalid manifest');
if (manifest.maps.length < 2 || manifest.maps.length > 3) fail('expected 2-3 maps');

const diskFiles = (await readdir(dir)).filter((name) => name.endsWith('.osz')).sort();
const listedFiles = manifest.maps.map((entry) => entry.file).sort();
if (JSON.stringify(diskFiles) !== JSON.stringify(listedFiles)) fail('manifest/file mismatch');

let total = 0;
const ids = new Set();
for (const entry of manifest.maps) {
  if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) fail(`bad id ${entry.id}`);
  ids.add(entry.id);
  if (!/^[a-z0-9-]+\.osz$/.test(entry.file)) fail(`bad file ${entry.file}`);
  if (!/^LICENSES\/[a-z0-9-]+\.md$/.test(entry.evidence)) fail(`bad evidence path ${entry.id}`);
  if (!/^https:\/\//.test(entry.sourceUrl)) fail(`bad source for ${entry.id}`);
  for (const field of ['artist', 'title', 'license', 'attribution', 'evidence']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) fail(`${entry.id}: ${field}`);
  }
  const bytes = await readFile(join(dir, entry.file));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== entry.sha256 || bytes.byteLength !== entry.byteLength) fail(`${entry.id}: hash/size`);
  await readFile(join(dir, entry.evidence), 'utf8');
  const names = Object.keys(unzipSync(bytes)).map((name) => name.toLowerCase());
  if (!names.some((name) => name.endsWith('.osu'))) fail(`${entry.id}: no .osu`);
  if (names.some((name) => /\.(mp4|avi|flv|mov|webm)$/.test(name))) fail(`${entry.id}: video`);
  total += bytes.byteLength;
}
if (total > 15_000_000) fail('15 MB budget exceeded');
console.log(`verified ${manifest.maps.length} starter maps (${total} bytes)`);
```

- [ ] **Step 5: Keep the starter UX** — retain `SongList` and `useSongBackground`, but make `bundledMaps()` read only `starterMaps()`. Upload remains visible below the list. Picking a starter map opens the existing difficulty picker; it is not copied to IndexedDB.

- [ ] **Step 6: Verify and commit**:

```bash
pnpm run verify:starter-maps
pnpm test
pnpm lint
pnpm build
```

Expected: all pass; `dist` contains exactly the manifest-approved starter `.osz` assets and no file from `game-assets/test-maps/`. Commit: `feat: add licensed starter map pack`.

### Task 0.2: Optional palm or index-fingertip cursor — TDD

**Files:**
- Create: `src/cv/cursorPoint.ts`, `src/cv/cursorPoint.test.ts`
- Modify: `src/ui/appState.ts`, `src/cv/cursorSource.ts`, `src/ui/home/MapCard.tsx`, `src/ui/settings/SettingsScreen.tsx`, `src/ui/calibrate/CalibrationScreen.tsx`

**Interfaces:**
- Produces `export type CursorAnchor = 'palm' | 'index'` and `cursorPoint(landmarks, anchor): Vec2`.
- Adds `Settings.cursorAnchor`, default `'palm'`. Every Play action still enters calibration, so the selected anchor is calibrated before gameplay.

- [ ] **Step 1: Write failing tests**:

```ts
import { describe, expect, it } from 'vitest';
import { cursorPoint } from './cursorPoint';

const landmarks = Array.from({ length: 21 }, (_, i) => ({ x: i / 100, y: i / 50 }));

describe('cursorPoint', () => {
  it('uses the existing palm center for palm mode', () => {
    expect(cursorPoint(landmarks, 'palm')).toEqual({ x: 0.088, y: 0.176 });
  });
  it('uses MediaPipe landmark 8 for index mode', () => {
    expect(cursorPoint(landmarks, 'index')).toEqual(landmarks[8]);
  });
});
```

Run `pnpm test src/cv/cursorPoint.test.ts` → FAIL (module missing).

- [ ] **Step 2: Implement**:

```ts
import type { Vec2 } from '../beatmap/model';
import { palmCenter } from './palm';

export type CursorAnchor = 'palm' | 'index';

export function cursorPoint(
  landmarks: { x: number; y: number }[],
  anchor: CursorAnchor,
): Vec2 {
  return anchor === 'index' ? { ...landmarks[8] } : palmCenter(landmarks);
}
```

Run the focused test → PASS.

- [ ] **Step 3: Wire settings and tracking** — add `cursorAnchor: CursorAnchor` to `Settings`, set `defaultSettings.cursorAnchor = 'palm'`, and include it in the `CursorSource.setSettings` pick. In `cursorSource.ts`, initialize `let cursorAnchor: CursorAnchor = 'palm'`, assign `cursorAnchor = s.cursorAnchor` in `setSettings`, and replace `palmCenter(result.landmarks)` with `cursorPoint(result.landmarks, cursorAnchor)`. Rename the `CursorSample.camera` comment from “palm position” to “selected raw cursor point.”

- [ ] **Step 4: Add selection UI** — on `MapCard`, add a “Cursor” select beside Mode/Visuals with `Palm` and `Index fingertip`; add the same select in Settings. Calibration text must name the selected anchor (“move your palm” / “move your index finger”). Changing it on the map card is safe because Play always routes through calibration.

- [ ] **Step 5: Manual verify** — run `pnpm dev`; calibrate/play once per anchor. Confirm palm behavior is unchanged, landmark 8 follows the fingertip, smoothing still applies, tracking loss behaves the same, and switching anchor forces the normal calibration flow. Run `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 6: Commit + PR** — commit `feat: add fingertip cursor option`; push `v1.4-onboarding`; open PR base `main` documenting every starter-map license/evidence and the 15 MB audit.

---

# Milestone 1 — Convex, routing, osu! sign-in (branch `v2.0-online-auth`, from `v1.4-onboarding`)

### Task 1: Install Convex + router, wire providers and routes

**Files:**
- Create: `vercel.json`, `src/ui/AppRoutes.tsx`
- Modify: `src/main.tsx`, `.gitignore` (ensure `.env.local` ignored), `AGENTS.md` (env setup note)
- No tests (wiring only; `pnpm build` is the check)

**Interfaces:**
- Produces: route paths `/` (game), `/leaderboard`, `/u/:osuId` used by all later UI tasks; `import.meta.env.VITE_CONVEX_URL` convention.

- [ ] **Step 1: Branch and install**

```bash
git checkout -b v2.0-online-auth
pnpm view convex version
pnpm view react-router version
pnpm view @convex-dev/auth version peerDependencies
pnpm add convex react-router @convex-dev/auth
pnpm add "@auth/core@$(pnpm view @convex-dev/auth peerDependencies.@auth/core)"
```

Confirm `pnpm list @convex-dev/auth @auth/core` shows a peer-compatible pair. This explicit range matters because the npm `latest` tag for `@auth/core` can lag behind versions required by current Convex Auth; trust the installed Convex Auth peer requirement rather than the older version number from this plan's first draft.

- [ ] **Step 2: Start Convex dev once** — `pnpm dlx convex dev --once`. If it asks for interactive login, STOP and ask the repo owner to complete Human prerequisite 1, then rerun. Confirm `convex/` dir and `.env.local` (with `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL`) exist. Confirm `.env.local` is gitignored; add it if not.

- [ ] **Step 3: Create `src/ui/AppRoutes.tsx`** — placeholder routes for now; leaderboard/profile pages replace the placeholders in Milestones 3/4:

```tsx
import { Route, Routes } from 'react-router';
import { App } from './App';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/leaderboard" element={<div className="screen-center">leaderboard — soon</div>} />
      <Route path="/u/:osuId" element={<div className="screen-center">profile — soon</div>} />
    </Routes>
  );
}
```

- [ ] **Step 4: Rewire `src/main.tsx`**:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Analytics } from '@vercel/analytics/react';
import './styles.css';
import { AppRoutes } from './ui/AppRoutes';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConvexAuthProvider>
    <Analytics />
  </StrictMode>,
);
```

- [ ] **Step 5: Create `vercel.json`** (SPA fallback so `/u/123` deep links work; Vercel serves real files first, so assets are unaffected):

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

- [ ] **Step 6: Document env setup** — append to `AGENTS.md` working rules: `- Convex backend lives in convex/. Local dev needs .env.local (created by pnpm dlx convex dev). Deployment env vars: AUTH_OSU_ID, AUTH_OSU_SECRET, SITE_URL.`

- [ ] **Step 7: Verify** — `pnpm build` passes, `pnpm run dev` still shows the game at `/`. Commit: `feat: add convex client, react-router shell, vercel SPA rewrite`

### Task 2: Convex Auth with osu! provider

**Files:**
- Create: `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts`, `convex/schema.ts`, `convex/users.ts`
- Test: manual sign-in flow (OAuth cannot be unit-tested meaningfully here)

**Interfaces:**
- Produces: `api.users.me` query returning the users doc (or null); users table fields `osuId: number`, `name`, `image`, `countryCode`, `countryName`, `totalPp`, `playCount`, `hitAccuracy`, `ppVersion`, `osuPp`, `osuGlobalRank`, `osuStatsSyncedAt` (all optional in schema); index `by_osuId`.
- Consumes: routes from Task 1.

- [ ] **Step 1: Initialize** — follow <https://labs.convex.dev/auth/setup> and the installed `@convex-dev/auth` CLI help for the current procedure. Dependencies were installed in Task 1. Baseline command:

```bash
pnpm dlx @convex-dev/auth
```

The initializer generates `convex/auth.config.ts`, `convex/auth.ts`, `convex/http.ts` and sets JWT key material on the deployment. Verify all three files exist.

- [ ] **Step 2: Configure the osu! provider in `convex/auth.ts`** — osu! returns no email; we map the osu! profile onto our user fields:

```ts
import Osu from '@auth/core/providers/osu';
import { convexAuth } from '@convex-dev/auth/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Osu({
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.username,
          image: profile.avatar_url,
          osuId: profile.id,
          countryCode: profile.country?.code,
          countryName: profile.country?.name,
        };
      },
    }),
  ],
});
```

- [ ] **Step 3: Write `convex/schema.ts`** — spread `authTables`, override `users` with our profile/stat fields (all optional — Convex Auth creates the doc):

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  users: defineTable({
    // standard Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // airosu identity
    osuId: v.optional(v.number()),
    countryCode: v.optional(v.string()),
    countryName: v.optional(v.string()),
    // denormalized play stats (written by scores.submit from Milestone 2 on)
    totalPp: v.optional(v.number()),
    playCount: v.optional(v.number()),
    hitAccuracy: v.optional(v.number()),
    ppVersion: v.optional(v.number()),
    // cached real-osu! stats (Milestone 4)
    osuPp: v.optional(v.number()),
    osuGlobalRank: v.optional(v.number()),
    osuStatsSyncedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_osuId', ['osuId']),
});
```

- [ ] **Step 4: Create `convex/users.ts`**:

```ts
import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId ? await ctx.db.get(userId) : null;
  },
});
```

- [ ] **Step 5: Push and verify env** — `pnpm dlx convex dev --once` succeeds (schema + functions deploy). Confirm `AUTH_OSU_ID`, `AUTH_OSU_SECRET`, `SITE_URL` are set: `pnpm dlx convex env list`. If missing, STOP and ask the repo owner (Human prerequisites 2–3).

- [ ] **Step 6: Manual verification** — `pnpm run dev`, temporarily call `signIn('osu')` from a scratch button (or complete Task 3 first and use the real button): browser goes to osu.ppy.sh consent, redirects back to localhost, `api.users.me` returns a doc with `osuId`, `name`, `image`, `countryCode`. Check the Convex dashboard `users` table.

- [ ] **Step 7: Commit** — `feat: osu! OAuth sign-in via convex auth`

### Task 3: Auth UI (navbar + sign-in button)

**Files:**
- Create: `src/ui/nav/NavBar.tsx`, `src/ui/nav/AuthButton.tsx`, `src/ui/nav/index.ts`
- Modify: `src/ui/home/MapLoadScreen.tsx` (mount AuthButton in the top-right cluster next to Settings), `src/ui/AppRoutes.tsx` (NavBar on `/leaderboard` and `/u/:osuId` routes), `src/styles.css` (nav styles)

**Interfaces:**
- Consumes: `api.users.me` (Task 2).
- Produces: `<AuthButton />` (self-contained: sign in / avatar + menu with "profile", "leaderboard", "sign out"); `<NavBar />` (site header with home/leaderboard links + AuthButton) used by leaderboard/profile pages.

- [ ] **Step 1: `src/ui/nav/AuthButton.tsx`**:

```tsx
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

export function AuthButton() {
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me);
  const [open, setOpen] = useState(false);

  if (me === undefined) return null; // loading — render nothing, no layout shift
  if (me === null) {
    return (
      <button className="btn btn--osu" onClick={() => void signIn('osu')}>
        sign in with osu!
      </button>
    );
  }
  return (
    <div className="auth-chip">
      <button className="auth-chip__face" onClick={() => setOpen((o) => !o)}>
        {me.image && <img src={me.image} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />}
        <span>{me.name}</span>
      </button>
      {open && (
        <div className="auth-chip__menu" onClick={() => setOpen(false)}>
          <Link to={`/u/${me.osuId}`}>profile</Link>
          <Link to="/leaderboard">leaderboard</Link>
          <button onClick={() => void signOut()}>sign out</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `src/ui/nav/NavBar.tsx`** — fixed header used on the two web pages (the game routes stay full-bleed):

```tsx
import { Link } from 'react-router';
import { AuthButton } from './AuthButton';

export function NavBar() {
  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        airosu<span style={{ color: 'var(--pink)' }}>!</span>
      </Link>
      <nav className="navbar__links">
        <Link to="/leaderboard">leaderboard</Link>
      </nav>
      <AuthButton />
    </header>
  );
}
```

`src/ui/nav/index.ts`: `export { NavBar } from './NavBar'; export { AuthButton } from './AuthButton';`

- [ ] **Step 3: Mount** — in `MapLoadScreen.tsx` place `<AuthButton />` beside the existing Settings button (same absolute top-right cluster, e.g. wrap both in a flex div). In `AppRoutes.tsx` wrap the two placeholder pages: `element={<><NavBar /><div>…</div></>}`. Add `.navbar`, `.auth-chip`, `.btn--osu` (osu! pink `#ff66aa`) styles to `styles.css` matching the existing panel/btn look.

- [ ] **Step 4: Manual verification** — `pnpm run dev`: sign in from home, avatar chip appears, menu links navigate, sign out works, game still playable signed out. `pnpm lint && pnpm build` pass.

- [ ] **Step 5: Commit and open PR**:

```bash
git add -A
git commit -m "feat: auth navbar and sign-in UI"
git push -u origin v2.0-online-auth
gh pr create --base v1.4-onboarding --title "airosu online M1: convex + osu! sign-in" \
  --body "Convex Auth with osu!-only sign-in and shareable routes, stacked on the licensed starter-map/fingertip onboarding PR. Dev and production use separate osu! OAuth applications/callbacks."
```

The PR body must list the separate dev/production OAuth callback setup and reference the starter-map rights audit in its base PR.

---

# Milestone 2 — pp formula module, map registry, score submission (branch `v2.1-scores`, from `v2.0-online-auth`)

### Task 4: Extract pure pp formula (`ppFormula.ts`) — TDD

**Files:**
- Create: `src/game/pp.compat.test.ts`, `src/game/ppFormula.ts`, `src/game/ppFormula.test.ts`, `src/game/grade.ts`
- Modify: `src/game/pp.ts` (delegate math), `src/ui/results/grade.ts` (re-export from game), `src/ui/results/ResultsScreen.tsx` + any `grade` importers (import path unchanged via re-export — verify)

**Interfaces:**
- Produces (used by convex functions and PpCounter):
  - `PP_VERSION: number` (starts at `1` — the current live formula)
  - `interface HitStats { count300: number; count100: number; count50: number; countMiss: number; maxCombo: number }` (moves here from `pp.ts`; `pp.ts` re-exports it)
  - `judgedCount(s: HitStats): number`
  - `accuracyOf(s: HitStats): number` — 0 when nothing judged
  - `playPp(worth: { ssPp: number; starRating: number }, s: HitStats): number`
  - `src/game/grade.ts`: `type Grade`, `grade(accuracy: number): Grade` (moved from `src/ui/results/grade.ts`; colors/labels stay in the UI file)
  - The refactor preserves the current formula: osu!lazer-derived SS worth × airosu accuracy/combo quality × computer-vision handicap `2 + 30 * exp(-starRating)`.
  - Palm and index cursor plays use identical PP v1 math; `cursorAnchor` is stored for future versioned policy changes.

- [ ] **Step 1: Lock current PP v1 outputs before refactoring** — create `src/game/pp.compat.test.ts` against the untouched `PpCounter`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties, loadFromOsz } from '../beatmap/load';
import { PpCounter, type HitStats } from './pp';

const kira = new Uint8Array(
  readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'),
);
const quaver = new Uint8Array(
  readFileSync('game-assets/test-maps/873811 dj TAKA - quaver.osz'),
);

function perfectStats(bytes: Uint8Array, difficultyName: string): HitStats {
  const map = loadFromOsz(bytes, difficultyName);
  const judged = map.objects.reduce((n, o) => n + (o.kind === 'slider' ? 2 : 1), 0);
  return { count300: judged, count100: 0, count50: 0, countMiss: 0, maxCombo: judged };
}

describe('airosu PP v1 compatibility', () => {
  it('preserves the scaled low-star and high-star SS values', () => {
    const diffs = listDifficulties(kira);
    const easy = diffs.find((d) => d.difficultyName.includes("Rocket's Easy"))!;
    const insane = diffs.find((d) => d.difficultyName.includes("Mamayu's Insane"))!;
    expect(new PpCounter(easy.osuText).final(perfectStats(kira, easy.difficultyName)))
      .toBeCloseTo(42.26395250711483, 8);
    expect(new PpCounter(insane.osuText).final(perfectStats(kira, insane.difficultyName)))
      .toBeCloseTo(347.776643644777, 8);
  });

  it('preserves the real hand-tracked quaver sample', () => {
    const beginner = listDifficulties(quaver)
      .find((d) => d.difficultyName.includes("Akitoshi's Beginner"))!;
    const play = { count300: 47, count100: 6, count50: 0, countMiss: 5, maxCombo: 19 };
    expect(new PpCounter(beginner.osuText).final(play)).toBeCloseTo(13.401307625182142, 8);
  });
});
```

- [ ] **Step 2: Prove and commit the characterization** — run `pnpm test src/game/pp.compat.test.ts`; expected PASS before any production change. Commit `test: lock airosu pp v1 scaling`.

- [ ] **Step 3: Write `src/game/ppFormula.test.ts`** (failing first):

```ts
import { describe, expect, it } from 'vitest';
import { PP_VERSION, accuracyOf, judgedCount, playPp } from './ppFormula';

const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

describe('ppFormula', () => {
  it('has a version', () => expect(PP_VERSION).toBe(1));

  it('accuracy: SS is 1, all-miss is 0, empty is 0', () => {
    expect(accuracyOf(ss)).toBe(1);
    expect(accuracyOf({ ...ss, count300: 0, countMiss: 100, maxCombo: 0 })).toBe(0);
    expect(accuracyOf({ count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 })).toBe(0);
  });

  it('judgedCount sums all judgments', () => expect(judgedCount(ss)).toBe(100));

  it('SS full combo earns ssPp × handicap', () => {
    // 3★ map: handicap = 2 + 30·e⁻³
    const expected = 100 * 1 * (2 + 30 * Math.exp(-3));
    expect(playPp({ ssPp: 100, starRating: 3 }, ss)).toBeCloseTo(expected, 6);
  });

  it('worse accuracy and combo earn strictly less', () => {
    const worth = { ssPp: 100, starRating: 3 };
    const worse = { ...ss, count300: 90, count100: 10, maxCombo: 50 };
    expect(playPp(worth, worse)).toBeLessThan(playPp(worth, ss));
    expect(playPp(worth, worse)).toBeGreaterThan(0);
  });

  it('zero judgments earn zero pp', () => {
    expect(playPp({ ssPp: 100, starRating: 3 }, { count300: 0, count100: 0, count50: 0, countMiss: 0, maxCombo: 0 })).toBe(0);
  });
});
```

- [ ] **Step 4: Run** `pnpm test src/game/ppFormula.test.ts` — FAILS (module not found).

- [ ] **Step 5: Implement `src/game/ppFormula.ts`** — lift the math verbatim from `pp.ts` lines 62–87 (quality curve, handicap) into pure functions. **This module must stay dependency-free** (no osu-* imports) — it is imported by Convex functions:

```ts
/**
 * airosu pp formula, shared verbatim by the client (live pp) and Convex
 * (authoritative pp on submit + recalc migrations).
 *
 * PP_VERSION identifies the formula that produced a stored pp value. Any
 * change to the math below MUST bump it and run the recalc migration
 * (docs/pp-rework-runbook.md).
 */
export const PP_VERSION = 1;

export interface HitStats {
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  maxCombo: number;
}

export interface MapWorth {
  /** lazer pp of an SS full combo — the map's worth */
  ssPp: number;
  starRating: number;
}

export function judgedCount(s: HitStats): number {
  return s.count300 + s.count100 + s.count50 + s.countMiss;
}

export function accuracyOf(s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0) return 0;
  return (s.count300 * 300 + s.count100 * 100 + s.count50 * 50) / (300 * judged);
}

export function playPp(worth: MapWorth, s: HitStats): number {
  const judged = judgedCount(s);
  if (judged === 0 || !Number.isFinite(worth.ssPp)) return 0;

  // player's share: gentler than lazer's curve — misses already cost
  // accuracy and break combo, so no separate miss penalty on top
  const accuracy = accuracyOf(s);
  const comboRatio = Math.min(1, s.maxCombo / judged);
  const quality = Math.pow(accuracy, 2.5) * (0.35 + 0.65 * Math.pow(comboRatio, 0.6));

  // hand-tracking handicap: ~×10 at 1★ easing to ~×2 past 5★
  const handicap = 2 + 30 * Math.exp(-worth.starRating);

  return worth.ssPp * quality * handicap;
}
```

- [ ] **Step 6: Refactor `src/game/pp.ts`** — delete the duplicated math; keep the lazer ssPp computation:

```ts
// pp.ts private method becomes:
private pp(attributes: StandardDifficultyAttributes, stats: HitStats): number {
  const judged = judgedCount(stats);
  if (judged === 0) return 0;
  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
  perfect.count300 = judged;
  const ssPp = ruleset
    .createPerformanceCalculator(attributes, perfect)
    .calculateAttributes().totalPerformance;
  return playPp({ ssPp, starRating: attributes.starRating }, stats);
}
```

with `import { judgedCount, playPp } from './ppFormula';` and `export type { HitStats } from './ppFormula';` replacing the local interface (keep the doc comment on the class).

- [ ] **Step 7: Move grade** — create `src/game/grade.ts` with `Grade` + `grade()` copied from `src/ui/results/grade.ts`; change the UI file to `export { grade, type Grade } from '../../game/grade';` keeping `gradeColor`/`judgmentColors`/`judgmentLabels` where they are.

- [ ] **Step 8: Run everything** — `pnpm test` (including exact compatibility values; no PP v1 number may change) and `pnpm lint && pnpm build`.

- [ ] **Step 9: Commit** — `refactor: extract versioned pp formula and grade into pure shared modules`

### Task 5: Server-side map attributes helper — TDD

**Files:**
- Create: `src/beatmap/attributes.ts`, `src/beatmap/attributes.test.ts`

**Interfaces:**
- Produces: `computeMapAttributes(osuText: string): MapAttributes` where

```ts
export interface MapAttributes {
  title: string; artist: string; version: string; creator: string;
  bpm: number; lengthMs: number; cs: number; ar: number; od: number; hp: number;
  starRating: number; maxCombo: number; objectCount: number; judgmentCount: number;
  ssPp: number; attributesVersion: number;
  beatmapId?: number; beatmapSetId?: number;
}
```

`objectCount` is the number of `.osu` hit objects. `judgmentCount` is what airosu emits: circles/spinners count once and sliders count twice (head + follow result). Submission validation and airosu's combo ratio use `judgmentCount`.

- Consumes: `toInternal` from `src/beatmap/adapter.ts` (meta + objects), osu-standard-stable ruleset. Runs in the Convex Node action (Task 6) and in vitest — must not touch DOM APIs.

- [ ] **Step 1: Write `src/beatmap/attributes.test.ts`** using the test-only fixture pattern (`src/beatmap/load.test.ts` reads `game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz`):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties, loadFromOsz } from './load';
import { computeMapAttributes } from './attributes';
import { PpCounter } from '../game/pp';
import { playPp } from '../game/ppFormula';

const osz = new Uint8Array(readFileSync('game-assets/test-maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'));
const easy = listDifficulties(osz).find((d) => /easy/i.test(d.difficultyName))!;

describe('computeMapAttributes', () => {
  it('extracts metadata, difficulty and worth', () => {
    const a = computeMapAttributes(easy.osuText);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.objectCount).toBeGreaterThan(0);
    expect(a.judgmentCount).toBeGreaterThanOrEqual(a.objectCount);
    expect(a.judgmentCount).toBe(
      loadFromOsz(osz, easy.difficultyName).objects.reduce(
        (count, object) => count + (object.kind === 'slider' ? 2 : 1),
        0,
      ),
    );
    expect(a.maxCombo).toBeGreaterThanOrEqual(a.objectCount);
    expect(a.starRating).toBeGreaterThan(0);
    expect(a.starRating).toBeLessThan(3);
    expect(a.ssPp).toBeGreaterThan(0);
    expect(a.beatmapSetId).toBe(444335);
    const ss = {
      count300: a.judgmentCount, count100: 0, count50: 0, countMiss: 0,
      maxCombo: a.judgmentCount,
    };
    expect(playPp(a, ss)).toBeCloseTo(new PpCounter(easy.osuText).final(ss), 6);
  });
});
```

- [ ] **Step 2: Run** `pnpm test src/beatmap/attributes.test.ts` — FAILS.

- [ ] **Step 3: Implement `src/beatmap/attributes.ts`**:

```ts
import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';
import { toInternal } from './adapter';

const decoder = new BeatmapDecoder();
const ruleset = new StandardRuleset();

/** Bump when parser/ruleset upgrades can change stored map attributes. */
export const ATTRIBUTES_VERSION = 1;

export interface MapAttributes {
  title: string; artist: string; version: string; creator: string;
  bpm: number; lengthMs: number; cs: number; ar: number; od: number; hp: number;
  starRating: number; maxCombo: number; objectCount: number; judgmentCount: number;
  ssPp: number; attributesVersion: number;
  beatmapId?: number; beatmapSetId?: number;
}

/** Authoritative map attributes computed server-side at registration. */
export function computeMapAttributes(osuText: string): MapAttributes {
  const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
  const internal = toInternal(parsed, osuText, new ArrayBuffer(0));
  const beatmap = ruleset.applyToBeatmap(parsed);
  const attributes = ruleset.createDifficultyCalculator(beatmap).calculate();
  const judgmentCount = internal.objects.reduce(
    (count, object) => count + (object.kind === 'slider' ? 2 : 1),
    0,
  );

  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
  // Match PpCounter.final(): airosu gives sliders a head + final judgment.
  perfect.count300 = judgmentCount;
  const ssPp = ruleset
    .createPerformanceCalculator(attributes, perfect)
    .calculateAttributes().totalPerformance;

  const m = internal.meta;
  return {
    title: m.title, artist: m.artist, version: m.version, creator: m.creator,
    bpm: m.bpm, lengthMs: m.lengthMs, cs: m.cs, ar: m.ar, od: m.od, hp: m.hp,
    starRating: attributes.starRating,
    maxCombo: attributes.maxCombo,
    objectCount: internal.objects.length,
    judgmentCount,
    ssPp: Number.isFinite(ssPp) ? ssPp : 0,
    attributesVersion: ATTRIBUTES_VERSION,
    beatmapId: parsed.metadata.beatmapId || undefined,
    beatmapSetId: parsed.metadata.beatmapSetId || undefined,
  };
}
```

(Verify the osu-parsers property names `metadata.beatmapId` / `metadata.beatmapSetId` against the installed package — adjust if the installed version differs.)

- [ ] **Step 4: Run** `pnpm test` — PASS. Commit: `feat: server-grade map attribute computation helper`

### Task 6: Convex schema + map registry + scoring logic — TDD on the pure part

**Files:**
- Create: `convex/lib/scoring.ts`, `src/game/scoring.test.ts` (tests the convex lib — vitest reaches into `convex/lib` fine), `convex/maps.ts`, `convex/mapsNode.ts`, `convex/osuApi.ts`
- Modify: `convex/schema.ts` (add `maps`, `scores` tables)

**Interfaces:**
- Produces:
  - schema tables `maps`, `scores` (fields below — later tasks rely on the exact names)
  - `convex/lib/scoring.ts`: `validateSubmission(map: { judgmentCount: number }, s: HitStats): string | null` (error string or null when valid) and `scoreDerived(map: { ssPp: number; starRating: number }, s: HitStats): { accuracy: number; grade: Grade; pp: number; ppVersion: number }` and `weightedTotals(best: { pp: number; accuracy: number }[]): { totalPp: number; hitAccuracy: number }` (0.95ⁱ weights, top 100)
  - `api.mapsNode.registerMap` action `{ osuText: string } → Id<'maps'>` (idempotent by md5)
  - `internal.maps.byMd5`, `internal.maps.insert`, `internal.maps.patchEnrichment` helpers
  - `internal.osuApi.enrichMap` action
- Consumes: `computeMapAttributes` (Task 5), `ppFormula`/`grade` (Task 4).

- [ ] **Step 1: Extend `convex/schema.ts`** — add below the users table:

```ts
maps: defineTable({
  md5: v.string(),
  title: v.string(),
  artist: v.string(),
  version: v.string(),
  creator: v.string(),
  bpm: v.number(),
  lengthMs: v.number(),
  cs: v.number(), ar: v.number(), od: v.number(), hp: v.number(),
  starRating: v.number(),
  maxCombo: v.number(),
  objectCount: v.number(),
  judgmentCount: v.number(),
  ssPp: v.number(),
  attributesVersion: v.number(),
  osuFileId: v.id('_storage'),
  // osu! website enrichment (best effort)
  osuBeatmapId: v.optional(v.number()),
  osuBeatmapSetId: v.optional(v.number()),
  rankedStatus: v.optional(v.string()), // ranked|approved|qualified|loved|graveyard|wip|pending|unknown
  coverUrl: v.optional(v.string()),
  officialStarRating: v.optional(v.number()),
}).index('by_md5', ['md5']),

scores: defineTable({
  userId: v.id('users'),
  mapId: v.id('maps'),
  playId: v.string(), // crypto.randomUUID() per completed play; retry key
  count300: v.number(),
  count100: v.number(),
  count50: v.number(),
  countMiss: v.number(),
  maxCombo: v.number(),
  score: v.number(),
  accuracy: v.number(),
  grade: v.string(),
  pp: v.number(),
  ppVersion: v.number(),
  isBest: v.boolean(), // best pp play by this user on this map
  inputMode: v.union(v.literal('relax'), v.literal('manual')),
  forgiveness: v.number(),
  cursorAnchor: v.union(v.literal('palm'), v.literal('index')),
})
  .index('by_user_play', ['userId', 'playId'])
  .index('by_user_map', ['userId', 'mapId'])
  .index('by_user_map_pp', ['userId', 'mapId', 'pp'])
  .index('by_map_best', ['mapId', 'isBest', 'pp'])
  .index('by_user_best', ['userId', 'isBest', 'pp'])
  .index('by_user', ['userId']),
```

- [ ] **Step 2: Write `src/game/scoring.test.ts`** (failing first):

```ts
import { describe, expect, it } from 'vitest';
import { PP_VERSION } from './ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from '../../convex/lib/scoring';

const map = { judgmentCount: 100, ssPp: 100, starRating: 3 };
const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

describe('validateSubmission', () => {
  it('accepts a full clean play', () => expect(validateSubmission(map, ss)).toBeNull());
  it('accepts slider-aware judgment totals larger than osu object count', () =>
    expect(validateSubmission({ judgmentCount: 100 }, ss)).toBeNull());
  it('rejects judgment counts that do not cover the map', () =>
    expect(validateSubmission(map, { ...ss, count300: 50 })).toMatch(/judgment/i));
  it('rejects impossible combo', () =>
    expect(validateSubmission(map, { ...ss, maxCombo: 101 })).toMatch(/combo/i));
  it('rejects negative and non-integer counts', () => {
    expect(validateSubmission(map, { ...ss, count100: -1, count300: 101 })).not.toBeNull();
    expect(validateSubmission(map, { ...ss, count300: 99.5, count100: 0.5 })).not.toBeNull();
  });
});

describe('scoreDerived', () => {
  it('computes accuracy, grade, pp, version', () => {
    const d = scoreDerived(map, ss);
    expect(d.accuracy).toBe(1);
    expect(d.grade).toBe('SS');
    expect(d.pp).toBeGreaterThan(0);
    expect(d.ppVersion).toBe(PP_VERSION);
  });
});

describe('weightedTotals', () => {
  it('weights 0.95^i over pp-descending plays', () => {
    const { totalPp, hitAccuracy } = weightedTotals([
      { pp: 100, accuracy: 1 },
      { pp: 50, accuracy: 0.9 },
    ]);
    expect(totalPp).toBeCloseTo(100 + 50 * 0.95, 6);
    expect(hitAccuracy).toBeCloseTo((1 + 0.9 * 0.95) / (1 + 0.95), 6);
  });
  it('is 0/0-safe', () => expect(weightedTotals([])).toEqual({ totalPp: 0, hitAccuracy: 0 }));
});
```

- [ ] **Step 3: Run** — FAILS. **Step 4: Implement `convex/lib/scoring.ts`**:

```ts
import { PP_VERSION, accuracyOf, judgedCount, playPp, type HitStats } from '../../src/game/ppFormula';
import { grade, type Grade } from '../../src/game/grade';

/** null when valid, else a human-readable rejection reason */
export function validateSubmission(map: { judgmentCount: number }, s: HitStats): string | null {
  const counts = [s.count300, s.count100, s.count50, s.countMiss, s.maxCombo];
  if (counts.some((c) => !Number.isInteger(c) || c < 0)) return 'invalid counts';
  if (judgedCount(s) !== map.judgmentCount) return 'judgment counts do not match the map';
  if (s.maxCombo > map.judgmentCount) return 'combo exceeds map maximum';
  return null;
}

export function scoreDerived(
  map: { ssPp: number; starRating: number },
  s: HitStats,
): { accuracy: number; grade: Grade; pp: number; ppVersion: number } {
  const accuracy = accuracyOf(s);
  return { accuracy, grade: grade(accuracy), pp: playPp(map, s), ppVersion: PP_VERSION };
}

/** osu!-style weighting: i-th best play counts 0.95^i; top 100 plays. */
export function weightedTotals(best: { pp: number; accuracy: number }[]): {
  totalPp: number;
  hitAccuracy: number;
} {
  const top = [...best].sort((a, b) => b.pp - a.pp).slice(0, 100);
  let totalPp = 0, accSum = 0, wSum = 0;
  top.forEach((p, i) => {
    const w = Math.pow(0.95, i);
    totalPp += p.pp * w;
    accSum += p.accuracy * w;
    wSum += w;
  });
  return { totalPp, hitAccuracy: wSum === 0 ? 0 : accSum / wSum };
}
```

- [ ] **Step 5: Run** `pnpm test` — PASS. Commit: `feat: convex schema for maps/scores and pure scoring lib`

- [ ] **Step 6: Implement `convex/maps.ts`** (default runtime — queries/mutations):

```ts
import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from './_generated/server';

export const byMd5 = internalQuery({
  args: { md5: v.string() },
  handler: (ctx, { md5 }) =>
    ctx.db.query('maps').withIndex('by_md5', (q) => q.eq('md5', md5)).unique(),
});

export const getInternal = internalQuery({
  args: { mapId: v.id('maps') },
  handler: (ctx, { mapId }) => ctx.db.get(mapId),
});

export const insert = internalMutation({
  args: {
    md5: v.string(), osuFileId: v.id('_storage'),
    title: v.string(), artist: v.string(), version: v.string(), creator: v.string(),
    bpm: v.number(), lengthMs: v.number(),
    cs: v.number(), ar: v.number(), od: v.number(), hp: v.number(),
    starRating: v.number(), maxCombo: v.number(), objectCount: v.number(),
    judgmentCount: v.number(), ssPp: v.number(), attributesVersion: v.number(),
    osuBeatmapId: v.optional(v.number()), osuBeatmapSetId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('maps').withIndex('by_md5', (q) => q.eq('md5', args.md5)).unique();
    if (existing) return { mapId: existing._id, created: false }; // registration raced
    return { mapId: await ctx.db.insert('maps', args), created: true };
  },
});

export const patchEnrichment = internalMutation({
  args: {
    mapId: v.id('maps'),
    rankedStatus: v.string(),
    osuBeatmapId: v.optional(v.number()),
    osuBeatmapSetId: v.optional(v.number()),
    coverUrl: v.optional(v.string()),
    officialStarRating: v.optional(v.number()),
  },
  handler: async (ctx, { mapId, ...patch }) => {
    await ctx.db.patch(mapId, patch);
  },
});

export const get = query({
  args: { mapId: v.id('maps') },
  handler: (ctx, { mapId }) => ctx.db.get(mapId),
});
```

- [ ] **Step 7: Implement `convex/mapsNode.ts`** (Node runtime — osu libs + md5):

```ts
'use node';
import { createHash } from 'node:crypto';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { getAuthUserId } from '@convex-dev/auth/server';
import { computeMapAttributes } from '../src/beatmap/attributes';

/** Registers a difficulty by its .osu text. Idempotent by md5. Returns mapId. */
export const registerMap = action({
  args: { osuText: v.string() },
  handler: async (ctx, { osuText }) => {
    if (!(await getAuthUserId(ctx))) throw new Error('not signed in');
    if (new TextEncoder().encode(osuText).byteLength > 1_000_000) {
      throw new Error('.osu file is too large');
    }
    const md5 = createHash('md5').update(osuText, 'utf8').digest('hex');
    const existing = await ctx.runQuery(internal.maps.byMd5, { md5 });
    if (existing) {
      if (!existing.rankedStatus) {
        await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId: existing._id });
      }
      return existing._id;
    }
    const a = computeMapAttributes(osuText);
    const osuFileId = await ctx.storage.store(new Blob([osuText], { type: 'text/plain' }));
    const inserted = await ctx.runMutation(internal.maps.insert, {
        md5, osuFileId,
        title: a.title, artist: a.artist, version: a.version, creator: a.creator,
        bpm: a.bpm, lengthMs: a.lengthMs, cs: a.cs, ar: a.ar, od: a.od, hp: a.hp,
        starRating: a.starRating, maxCombo: a.maxCombo, objectCount: a.objectCount,
        judgmentCount: a.judgmentCount, ssPp: a.ssPp, attributesVersion: a.attributesVersion,
        osuBeatmapId: a.beatmapId, osuBeatmapSetId: a.beatmapSetId,
      }).catch(async (error) => {
      await ctx.storage.delete(osuFileId);
      throw error;
    });
    if (!inserted.created) await ctx.storage.delete(osuFileId); // concurrent registration lost
    await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId: inserted.mapId });
    return inserted.mapId;
  },
});
```

- [ ] **Step 8: Implement `convex/osuApi.ts`** (default runtime; `fetch` is available in Convex actions). Uses the same osu! OAuth client via client-credentials — no user tokens:

```ts
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

/** App-level token, `public` scope. Fetched fresh per action — usage is rare. */
export async function osuToken(): Promise<string> {
  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: Number(process.env.AUTH_OSU_ID),
      client_secret: process.env.AUTH_OSU_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });
  if (!res.ok) throw new Error(`osu! token: ${res.status}`);
  return (await res.json()).access_token as string;
}

export const enrichMap = internalAction({
  args: { mapId: v.id('maps') },
  handler: async (ctx, { mapId }) => {
    try {
      const map = await ctx.runQuery(internal.maps.getInternal, { mapId });
      if (!map) return;
      const token = await osuToken();
      const lookup = map.osuBeatmapId
        ? `id=${map.osuBeatmapId}`
        : `checksum=${encodeURIComponent(map.md5)}`;
      const res = await fetch(
        `https://osu.ppy.sh/api/v2/beatmaps/lookup?${lookup}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      );
      if (res.status === 404) {
        await ctx.runMutation(internal.maps.patchEnrichment, { mapId, rankedStatus: 'unknown' });
        return;
      }
      if (!res.ok) throw new Error(`lookup ${res.status}`);
      const b = await res.json();
      await ctx.runMutation(internal.maps.patchEnrichment, {
        mapId,
        rankedStatus: b.status ?? 'unknown',
        osuBeatmapId: b.id ?? undefined,
        osuBeatmapSetId: b.beatmapset_id ?? undefined,
        coverUrl: b.beatmapset?.covers?.['cover@2x'] ?? b.beatmapset?.covers?.cover ?? undefined,
        officialStarRating: b.difficulty_rating ?? undefined,
      });
    } catch {
      // enrichment is best-effort; a later registerMap call retries it
    }
  },
});
```

- [ ] **Step 9: Deploy + smoke test** — `pnpm dlx convex dev --once`. Then from the dashboard or CLI run the action with a real `.osu` text (paste one difficulty from any bundled `.osz`, unzipped locally): `pnpm dlx convex run mapsNode:registerMap '{"osuText": "..."}'` is unwieldy — easier from the app in Task 7; at minimum verify the deploy compiled the Node action. Commit: `feat: map registry with server-side attributes and osu! enrichment`

### Task 7: Score submission (server) + user totals

**Files:**
- Create: `convex/scores.ts`, `convex/scores.test.ts`
- Test: `src/game/scoring.test.ts` (pure rules) + `convex/scores.test.ts` (auth/idempotency handler)

**Interfaces:**
- Produces:
  - `api.scores.submit` mutation `{ playId, mapId, count300, count100, count50, countMiss, maxCombo, score, inputMode, forgiveness, cursorAnchor } → { pp: number; isBest: boolean; grade: string; accuracy: number }`. A repeated `(userId, playId)` returns the original score without incrementing play count.
  - `recomputeUserTotals(ctx: MutationCtx, userId: Id<'users'>): Promise<void>` (exported — reused by the recalc migration in Task 9 and aggregates in Milestone 3)
  - `api.scores.mapLeaderboard` query `{ mapId } → rows` (top 50 best scores + user name/avatar/country)
- Consumes: schema (Task 6), `scoring.ts`, `getAuthUserId`.

- [ ] **Step 1: Implement `convex/scores.ts`**:

```ts
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { PP_VERSION } from '../src/game/ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from './lib/scoring';

export async function recomputeUserTotals(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const best = await ctx.db
    .query('scores')
    .withIndex('by_user_best', (q) => q.eq('userId', userId).eq('isBest', true))
    .order('desc')
    .take(100);
  const totals = weightedTotals(best);
  await ctx.db.patch(userId, {
    totalPp: totals.totalPp,
    hitAccuracy: totals.hitAccuracy,
    ppVersion: PP_VERSION,
  });
}

export const submit = mutation({
  args: {
    playId: v.string(),
    mapId: v.id('maps'),
    count300: v.number(), count100: v.number(), count50: v.number(), countMiss: v.number(),
    maxCombo: v.number(), score: v.number(),
    inputMode: v.union(v.literal('relax'), v.literal('manual')),
    forgiveness: v.number(),
    cursorAnchor: v.union(v.literal('palm'), v.literal('index')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('not signed in');
    if (!/^[0-9a-f-]{36}$/i.test(args.playId)) throw new ConvexError('invalid play id');
    const duplicate = await ctx.db
      .query('scores')
      .withIndex('by_user_play', (q) => q.eq('userId', userId).eq('playId', args.playId))
      .unique();
    if (duplicate) {
      return {
        pp: duplicate.pp, isBest: duplicate.isBest,
        grade: duplicate.grade, accuracy: duplicate.accuracy,
      };
    }
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new ConvexError('unknown map');
    if (!Number.isSafeInteger(args.score) || args.score < 0) {
      throw new ConvexError('score could not be verified: invalid score');
    }
    if (!Number.isFinite(args.forgiveness) || args.forgiveness < 1 || args.forgiveness > 2.5) {
      throw new ConvexError('score could not be verified: invalid forgiveness');
    }

    const stats = {
      count300: args.count300, count100: args.count100, count50: args.count50,
      countMiss: args.countMiss, maxCombo: args.maxCombo,
    };
    const invalid = validateSubmission(map, stats);
    if (invalid) throw new ConvexError(`score could not be verified: ${invalid}`);

    const derived = scoreDerived(map, stats);

    // previous best on this map, indexed by pp
    const prevBest = await ctx.db
      .query('scores')
      .withIndex('by_user_map_pp', (q) => q.eq('userId', userId).eq('mapId', args.mapId))
      .order('desc')
      .first();
    // A pp tie replaces the older play, matching the index's pp/creation-time order.
    const isBest = !prevBest || derived.pp >= prevBest.pp;
    if (isBest && prevBest) await ctx.db.patch(prevBest._id, { isBest: false });

    await ctx.db.insert('scores', {
      userId, playId: args.playId, mapId: args.mapId, ...stats,
      score: args.score, inputMode: args.inputMode, forgiveness: args.forgiveness,
      cursorAnchor: args.cursorAnchor,
      accuracy: derived.accuracy, grade: derived.grade, pp: derived.pp,
      ppVersion: derived.ppVersion, isBest,
    });

    const user = await ctx.db.get(userId);
    await ctx.db.patch(userId, { playCount: (user?.playCount ?? 0) + 1 });
    if (isBest) await recomputeUserTotals(ctx, userId);

    return { pp: derived.pp, isBest, grade: derived.grade, accuracy: derived.accuracy };
  },
});

export const mapLeaderboard = query({
  args: { mapId: v.id('maps') },
  handler: async (ctx, { mapId }) => {
    const rows = await ctx.db
      .query('scores')
      .withIndex('by_map_best', (q) => q.eq('mapId', mapId).eq('isBest', true))
      .order('desc')
      .take(50);
    return Promise.all(
      rows.map(async (s) => {
        const u = await ctx.db.get(s.userId);
        return {
          scoreId: s._id, pp: s.pp, accuracy: s.accuracy, grade: s.grade,
          maxCombo: s.maxCombo, inputMode: s.inputMode, forgiveness: s.forgiveness,
          cursorAnchor: s.cursorAnchor,
          playedAt: s._creationTime,
          osuId: u?.osuId, name: u?.name, image: u?.image, countryCode: u?.countryCode,
        };
      }),
    );
  },
});
```

- [ ] **Step 2: Add a Convex idempotency test** — install `pnpm add -D convex-test`, verify its peer range against installed `convex`, then create `convex/scores.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('scores.submit', () => {
  it('stores the same playId only once', async () => {
    const t = convexTest(schema, modules);
    const { userId, mapId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { osuId: 7, name: 'player' });
      const osuFileId = await ctx.storage.store(new Blob(['osu file format v14']));
      const mapId = await ctx.db.insert('maps', {
        md5: 'a'.repeat(32), title: 'T', artist: 'A', version: 'Hard', creator: 'M',
        bpm: 120, lengthMs: 60_000, cs: 4, ar: 8, od: 7, hp: 5,
        starRating: 3, maxCombo: 120, objectCount: 80, judgmentCount: 100,
        ssPp: 100, attributesVersion: 1, osuFileId,
      });
      return { userId, mapId };
    });
    const authed = t.withIdentity({ subject: `${userId}|test-session` });
    const args = {
      playId: '11111111-1111-4111-8111-111111111111', mapId,
      count300: 100, count100: 0, count50: 0, countMiss: 0,
      maxCombo: 100, score: 123_456, inputMode: 'relax' as const, forgiveness: 1.5,
      cursorAnchor: 'palm' as const,
    };

    const first = await authed.mutation(api.scores.submit, args);
    const second = await authed.mutation(api.scores.submit, args);
    expect(second).toEqual(first);
    const state = await t.run(async (ctx) => ({
      scores: await ctx.db.query('scores').collect(),
      user: await ctx.db.get(userId),
    }));
    expect(state.scores).toHaveLength(1);
    expect(state.user?.playCount).toBe(1);
  });
});
```

- [ ] **Step 3: Deploy** — `pnpm dlx convex dev --once` compiles. `pnpm test && pnpm lint` pass. Commit: `feat: score submission with server-side pp and per-map leaderboard query`

### Task 8: Results-screen submission UI

**Files:**
- Create: `src/online/useSubmitScore.ts`, `src/ui/results/SubmitPanel.tsx`, `src/ui/results/MapLeaderboard.tsx`, `src/ui/shared/flag.ts`, `src/ui/shared/flag.test.ts`
- Modify: `src/ui/appState.ts` (LastResult gains `playId`, `inputMode`, `forgiveness`, `cursorAnchor`), the `setLastResult` call site in `src/ui/play/` (generate one UUID and capture the active settings), `src/ui/results/ResultsScreen.tsx` (mount `<SubmitPanel />`), `src/ui/results/index.ts`

**Interfaces:**
- Consumes: `api.mapsNode.registerMap`, `api.scores.submit`, `api.users.me`, appState (`map.rawOsu`, `lastResult`).
- Produces: `useSubmitScore(): { status: 'signedOut'|'idle'|'submitting'|'done'|'error'; result?: { pp: number; isBest: boolean }; mapId?: Id<'maps'>; error?: string; submit(): void }` — auto-submits once on mount when signed in; `mapId` is set once registration succeeds and drives the per-map leaderboard.

- [ ] **Step 1: Extend LastResult** — in `appState.ts` add `playId: string; inputMode: 'relax' | 'manual'; forgiveness: number; cursorAnchor: 'palm' | 'index';` to `LastResult`. In `useGameLoop.finish`, add `playId: crypto.randomUUID(), inputMode: settings.inputMode, forgiveness: settings.forgiveness, cursorAnchor: settings.cursorAnchor`. The ID is created once when the result is captured, not inside the submit hook, so every retry reuses it. Fix any test fixtures that construct `LastResult`.

- [ ] **Step 2: `src/online/useSubmitScore.ts`**:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useAppState } from '../ui/appState';

export type SubmitStatus = 'signedOut' | 'idle' | 'submitting' | 'done' | 'error';

/** Submits the finished play once; exposes retry. Never blocks gameplay. */
export function useSubmitScore() {
  const { map, lastResult } = useAppState();
  const me = useQuery(api.users.me);
  const registerMap = useAction(api.mapsNode.registerMap);
  const submitScore = useMutation(api.scores.submit);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<{ pp: number; isBest: boolean }>();
  const [mapId, setMapId] = useState<Id<'maps'>>();
  const [error, setError] = useState<string>();
  const startedRef = useRef(false);

  const submit = useCallback(() => {
    if (!map || !lastResult || !me) return;
    setStatus('submitting');
    setError(undefined);
    void (async () => {
      try {
        const mapId = await registerMap({ osuText: map.rawOsu });
        setMapId(mapId);
        const res = await submitScore({
          playId: lastResult.playId, mapId,
          count300: lastResult.counts[300], count100: lastResult.counts[100],
          count50: lastResult.counts[50], countMiss: lastResult.counts[0],
          maxCombo: lastResult.maxCombo, score: lastResult.score,
          inputMode: lastResult.inputMode, forgiveness: lastResult.forgiveness,
          cursorAnchor: lastResult.cursorAnchor,
        });
        setResult({ pp: res.pp, isBest: res.isBest });
        setStatus('done');
      } catch (e) {
        setError(e instanceof ConvexError ? String(e.data) : 'submission failed');
        setStatus('error');
      }
    })();
  }, [map, lastResult, me, registerMap, submitScore]);

  useEffect(() => {
    if (me === null) { setStatus('signedOut'); return; }
    if (me && !startedRef.current && map && lastResult) {
      startedRef.current = true;
      submit();
    }
  }, [me, map, lastResult, submit]);

  return { status, result, mapId, error, submit };
}
```

- [ ] **Step 3: `src/ui/results/SubmitPanel.tsx`** — small panel under the stats: signedOut → "sign in with osu! to submit scores" (`<AuthButton />` or a signIn button); submitting → "submitting…"; done → "score submitted · +{pp}pp{isBest ? ' · personal best!' : ''}"; error → message + retry button calling `submit()`. Keep under 60 lines, match results-screen styling. Mount it in `ResultsScreen.tsx` below the stats block.

- [ ] **Step 3b: flag helper (TDD)** — create `src/ui/shared/flag.ts` + `src/ui/shared/flag.test.ts` (used here and by the leaderboard/profile pages later). Test first:

```ts
import { expect, it } from 'vitest';
import { flagEmoji } from './flag';

it('maps ISO code to regional-indicator emoji', () => {
  expect(flagEmoji('PH')).toBe('🇵🇭');
  expect(flagEmoji('jp')).toBe('🇯🇵');
});
it('falls back to white flag for junk', () => expect(flagEmoji('??')).toBe('🏳️'));
```

Run (fails), implement:

```ts
/** ISO 3166-1 alpha-2 → flag emoji via regional indicator symbols. */
export function flagEmoji(code: string): string {
  if (!/^[a-zA-Z]{2}$/.test(code)) return '🏳️';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
}
```

Run again — PASS.

- [ ] **Step 3c: `src/ui/results/MapLeaderboard.tsx`** — per-map top plays, rendered under the SubmitPanel once `mapId` is known (spec: per-map leaderboard on results). `useQuery(api.scores.mapLeaderboard, mapId ? { mapId } : 'skip')`; render nothing while loading/empty; otherwise a compact list of the top 10: `#i · flagEmoji(countryCode)+name (link to /u/{osuId}) · grade · accuracy · pp`, with a small `manual`, `index`, or non-default forgiveness badge when applicable, highlighting the signed-in user's row. Keep <100 lines.

- [ ] **Step 4: Manual verification (full loop)** — `pnpm run dev`: signed out, finish a short play → prompt shown, game unaffected. Sign in, play again → "submitting…" then "+Xpp · personal best!". Convex dashboard: `maps` row exists (with enrichment arriving later when the map is known to osu!), `scores` row has `isBest: true`, user doc has `totalPp > 0`, `playCount: 1`. Click retry submission or remount the results UI with the same `playId` → still one score and `playCount: 1`. Play the same map worse with a new `playId` → second score `isBest: false`, `totalPp` unchanged. Include a slider map to prove `judgmentCount` validation accepts it. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit** — `feat: auto-submit scores from results screen`

### Task 9: pp rework machinery (migrations + runbook)

**Files:**
- Create: `convex/convex.config.ts`, `convex/migrations.ts`, `docs/pp-rework-runbook.md`
- Modify: `convex/maps.ts`, `convex/mapsNode.ts` (attribute refresh path)

**Interfaces:**
- Consumes: `recomputeUserTotals` (Task 7), `scoreDerived` (Task 6), `PP_VERSION`.
- Produces: internal migrations `recalcScores`, `recalcBestFlags`, `recalcUsers`; runner `internal.migrations.runPpRework`; resumable Node action `api.mapsNode.refreshAttributes` for `ATTRIBUTES_VERSION` changes.

Read the installed `@convex-dev/migrations` README and types before implementing; its runner API is version-sensitive.

- [ ] **Step 1: Install + register component**:

```bash
pnpm add @convex-dev/migrations
```

`convex/convex.config.ts`:

```ts
import { defineApp } from 'convex/server';
import migrations from '@convex-dev/migrations/convex.config';

const app = defineApp();
app.use(migrations);
export default app;
```

- [ ] **Step 2: `convex/migrations.ts`** — three phases: recompute every score's pp, then fix isBest per (user, map), then recompute user totals:

```ts
import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import { PP_VERSION } from '../src/game/ppFormula';
import { scoreDerived } from './lib/scoring';
import { recomputeUserTotals } from './scores';

export const migrations = new Migrations<DataModel>(components.migrations);

/** Phase 1: recompute pp for every score under the current PP_VERSION. */
export const recalcScores = migrations.define({
  table: 'scores',
  migrateOne: async (ctx, score) => {
    if (score.ppVersion === PP_VERSION) return;
    const map = await ctx.db.get(score.mapId);
    if (!map) return;
    const d = scoreDerived(map, score);
    return { pp: d.pp, accuracy: d.accuracy, grade: d.grade, ppVersion: PP_VERSION };
  },
});

/** Phase 2: new formula may reorder plays on a map — refresh each flag with an indexed lookup. */
export const recalcBestFlags = migrations.define({
  table: 'scores',
  migrateOne: async (ctx, score) => {
    const best = await ctx.db
      .query('scores')
      .withIndex('by_user_map_pp', (q) =>
        q.eq('userId', score.userId).eq('mapId', score.mapId),
      )
      .order('desc')
      .first();
    return { isBest: best?._id === score._id };
  },
});

/** Phase 3: recompute denormalized totals (also refreshes leaderboard aggregates once Milestone 3 lands). */
export const recalcUsers = migrations.define({
  table: 'users',
  migrateOne: async (ctx, user) => {
    await recomputeUserTotals(ctx, user._id);
  },
});

export const runPpRework = migrations.runner([
  internal.migrations.recalcScores,
  internal.migrations.recalcBestFlags,
  internal.migrations.recalcUsers,
]);
```

- [ ] **Step 2b: Add attribute refresh** — add `.index('by_attributes_version', ['attributesVersion'])` to the maps table. Add this query/patch shape to `convex/maps.ts` (import `paginationOptsValidator` from `convex/server`):

```ts
export const staleAttributes = internalQuery({
  args: { version: v.number(), paginationOpts: paginationOptsValidator },
  handler: (ctx, { version, paginationOpts }) =>
    ctx.db.query('maps')
      .withIndex('by_attributes_version', (q) => q.lt('attributesVersion', version))
      .paginate(paginationOpts),
});

export const patchAttributes = internalMutation({
  args: {
    mapId: v.id('maps'), attributesVersion: v.number(),
    title: v.string(), artist: v.string(), version: v.string(), creator: v.string(),
    bpm: v.number(), lengthMs: v.number(), cs: v.number(), ar: v.number(),
    od: v.number(), hp: v.number(), starRating: v.number(), maxCombo: v.number(),
    objectCount: v.number(), judgmentCount: v.number(), ssPp: v.number(),
    osuBeatmapId: v.optional(v.number()), osuBeatmapSetId: v.optional(v.number()),
  },
  handler: (ctx, { mapId, ...attributes }) => ctx.db.patch(mapId, attributes),
});
```

In `convex/mapsNode.ts`, import `internalAction` and `ATTRIBUTES_VERSION`, then add:

```ts
export const refreshAttributes = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const batch = await ctx.runQuery(internal.maps.staleAttributes, {
      version: ATTRIBUTES_VERSION,
      paginationOpts: { numItems: 25, cursor: cursor ?? null },
    });
    let updated = 0;
    for (const map of batch.page) {
      const blob = await ctx.storage.get(map.osuFileId);
      if (!blob) continue;
      const attributes = computeMapAttributes(await blob.text());
      await ctx.runMutation(internal.maps.patchAttributes, { mapId: map._id, ...attributes });
      updated++;
    }
    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.mapsNode.refreshAttributes, {
        cursor: batch.continueCursor,
      });
    }
    return { updated, isDone: batch.isDone, continueCursor: batch.continueCursor };
  },
});
```

Run it from the dashboard or CLI as `pnpm dlx convex run mapsNode:refreshAttributes`. It is internal, so browser clients cannot call it. Do not try to read file blobs inside a migration mutation.

- [ ] **Step 3: `docs/pp-rework-runbook.md`**:

```markdown
# pp rework runbook

For a formula-only change (`src/game/ppFormula.ts`):

1. Change the math and **bump `PP_VERSION`**.
2. Add the new version's expectations. Keep `pp.compat.test.ts` PP v1 values as
   named historical fixtures; do not silently rewrite them to make a refactor pass.
3. Deploy: `pnpm dlx convex dev --once` (dev) / `pnpm dlx convex deploy` (prod).
4. Run the recalculation: `pnpm dlx convex run migrations:runPpRework` (add `--prod` for production).
   It replays: score pp → isBest flags → user totals (+ leaderboard aggregates).
5. Verify: spot-check a user in the dashboard — `users.ppVersion === PP_VERSION`,
   leaderboard order changed as expected. Scores keep their `ppVersion`, so an
   interrupted run is resumable by rerunning step 4.

For a parser or `osu-standard-stable` change that can alter star rating,
max combo, or SS worth:

1. Bump `ATTRIBUTES_VERSION` in `src/beatmap/attributes.ts` and also bump
   `PP_VERSION` so every dependent score is replayed.
2. Deploy, run the attribute-refresh runner until no stale maps remain, then
   run `migrations:runPpRework`.
3. Verify sampled maps have the new `attributesVersion`, then verify scores,
   best flags, user totals, and leaderboard ranks as above.

Never edit stored pp by hand: stored hit stats + map attributes are the source
of truth; pp is always derivable.
```

- [ ] **Step 4: Verify** — `pnpm dlx convex dev --once` deploys; run `pnpm dlx convex run migrations:runPpRework` against dev data from Task 8 and confirm it completes and totals are unchanged (same PP_VERSION → no-op). Temporarily exercise the attribute refresh against one dev map and confirm it is resumable; restore version constants before committing. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit + PR** — `feat: pp rework migrations and runbook`; open PR "airosu online M2: scores + pp pipeline" based on `v2.0-online-auth`.

---

# Milestone 3 — Leaderboards (branch `v2.2-leaderboard`, from `v2.1-scores`)

### Task 10: Leaderboard aggregates

**Files:**
- Create: `convex/leaderboard.ts`
- Modify: `convex/convex.config.ts` (two aggregate components), `convex/scores.ts` (`recomputeUserTotals` maintains aggregates), `convex/auth.ts` (country-change sync), `convex/schema.ts` (add `countries` table + `users.boardCountryCode`)

**Interfaces:**
- Produces:
  - `globalBoard` / `countryBoard` TableAggregates over `users` sorted by `-totalPp` (countryBoard namespaced by `countryCode`)
  - `api.leaderboard.page` query `{ countryCode?: string; offset: number } → { total: number; rows: { rank, osuId, name, image, countryCode, totalPp, hitAccuracy, playCount }[] }` (50 rows/page)
  - `api.leaderboard.countries` query `→ { code: string; name: string }[]`
  - `userRanks(ctx, user) → { globalRank: number | null; countryRank: number | null }` helper exported for the profile (Milestone 4)
- Consumes: `recomputeUserTotals` from Task 7.

**API caution:** verify method names (`replaceOrInsert`, `count`, `at`, `indexOf`, namespace option shape) against the installed `@convex-dev/aggregate` README/types and the component's example `leaderboard.ts` (github.com/get-convex/aggregate). Adapt if they differ — the shapes below are from the documented API.

- [ ] **Step 1: Install + register**:

```bash
pnpm add @convex-dev/aggregate
```

In `convex/convex.config.ts` add:

```ts
import aggregate from '@convex-dev/aggregate/convex.config';
// after app.use(migrations):
app.use(aggregate, { name: 'globalBoard' });
app.use(aggregate, { name: 'countryBoard' });
```

- [ ] **Step 2: Add `countries` table and board-country snapshot to schema** (drives the filter dropdown without scanning users and lets a later osu! country change move the aggregate safely):

```ts
countries: defineTable({ code: v.string(), name: v.string() }).index('by_code', ['code']),
```

Add `boardCountryCode: v.optional(v.string())` to the existing users table.

- [ ] **Step 3: `convex/leaderboard.ts`**:

```ts
import { TableAggregate } from '@convex-dev/aggregate';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { DataModel, Doc } from './_generated/dataModel';

export const globalBoard = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: 'users';
}>(components.globalBoard, { sortKey: (u) => -(u.totalPp ?? 0) });

export const countryBoard = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: 'users';
}>(components.countryBoard, {
  namespace: (u) => u.boardCountryCode ?? u.countryCode ?? '??',
  sortKey: (u) => -(u.totalPp ?? 0),
});

/** Call whenever a user's totalPp (or country) may have changed. */
export async function syncBoards(ctx: MutationCtx, before: Doc<'users'> | null, after: Doc<'users'>) {
  const wasRanked = (before?.totalPp ?? 0) > 0;
  const isRanked = (after.totalPp ?? 0) > 0;
  if (wasRanked && isRanked && before) {
    await globalBoard.replace(ctx, before, after);
    await countryBoard.replace(ctx, before, after);
  } else if (wasRanked && before) {
    await globalBoard.deleteIfExists(ctx, before);
    await countryBoard.deleteIfExists(ctx, before);
  } else if (isRanked) {
    await globalBoard.insertIfDoesNotExist(ctx, after);
    await countryBoard.insertIfDoesNotExist(ctx, after);
  }
  if (isRanked && after.countryCode && after.countryName) {
    const seen = await ctx.db
      .query('countries').withIndex('by_code', (q) => q.eq('code', after.countryCode!)).unique();
    if (!seen) await ctx.db.insert('countries', { code: after.countryCode, name: after.countryName });
  }
}

export async function userRanks(ctx: QueryCtx | MutationCtx, user: Doc<'users'>) {
  if ((user.totalPp ?? 0) <= 0) return { globalRank: null, countryRank: null };
  const globalRank = 1 + (await globalBoard.indexOfDoc(ctx, user));
  const countryRank = user.countryCode
    ? 1 + (await countryBoard.indexOfDoc(ctx, user))
    : null;
  return { globalRank, countryRank };
}

const PAGE = 50;

export const page = query({
  args: { countryCode: v.optional(v.string()), offset: v.number() },
  handler: async (ctx, { countryCode, offset }) => {
    const ns = countryCode ? { namespace: countryCode } : undefined;
    const board = countryCode ? countryBoard : globalBoard;
    const total = await board.count(ctx, ns as never);
    const offsets = Array.from(
      { length: Math.max(0, Math.min(PAGE, total - offset)) },
      (_, i) => offset + i,
    );
    const items = countryCode
      ? await countryBoard.atBatch(ctx, offsets.map((itemOffset) => ({ offset: itemOffset, namespace: countryCode })))
      : await globalBoard.atBatch(ctx, offsets.map((itemOffset) => ({ offset: itemOffset })));
    const users = await Promise.all(items.map((item) => ctx.db.get(item.id)));
    const rows = users.flatMap((u, i) =>
      u
        ? [{
        rank: offsets[i] + 1, osuId: u.osuId, name: u.name, image: u.image,
        countryCode: u.countryCode, totalPp: u.totalPp,
        hitAccuracy: u.hitAccuracy ?? 0, playCount: u.playCount ?? 0,
          }]
        : [],
    );
    return { total, rows };
  },
});

export const countries = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('countries').collect();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },
});
```

- [ ] **Step 4: Hook into `recomputeUserTotals`** in `convex/scores.ts` — read the user doc before patching, patch, read after, then `await syncBoards(ctx, before, after)` (import from `./leaderboard`). Users only enter the boards after their first submission — exactly what we want.

Also import `syncBoards` in `convex/auth.ts` and add this callback beside `providers`:

```ts
callbacks: {
  async afterUserCreatedOrUpdated(ctx, { userId }) {
    const before = await ctx.db.get(userId);
    if (!before || before.boardCountryCode === before.countryCode) return;
    await ctx.db.patch(userId, { boardCountryCode: before.countryCode });
    const after = await ctx.db.get(userId);
    if (after) await syncBoards(ctx, before, after);
  },
},
```

This moves an already-ranked user between country namespaces if their osu! country changes. New/unranked users do not enter either board.

- [ ] **Step 5: Backfill migration** — add to `convex/migrations.ts`:

```ts
export const backfillBoards = migrations.define({
  table: 'users',
  migrateOne: async (ctx, user) => {
    if (!user.totalPp) return;
    await syncBoards(ctx, null, user);
  },
});
export const runBackfillBoards = migrations.runner(internal.migrations.backfillBoards);
```

- [ ] **Step 6: Deploy + verify** — `pnpm dlx convex dev --once`; `pnpm dlx convex run migrations:runBackfillBoards`; then `pnpm dlx convex run leaderboard:page '{"offset": 0}'` returns your Task 8 test user ranked #1. Submit another play in the app → rank/total update live. Commit: `feat: leaderboard aggregates, page query, country registry`

### Task 11: Leaderboard page UI

**Files:**
- Create: `src/ui/leaderboard/LeaderboardPage.tsx`, `src/ui/leaderboard/LeaderboardRow.tsx`, `src/ui/leaderboard/index.ts`
- Modify: `src/ui/AppRoutes.tsx` (replace placeholder), `src/styles.css`

**Interfaces:**
- Consumes: `api.leaderboard.page`, `api.leaderboard.countries` (Task 10), `flagEmoji` from `src/ui/shared/flag.ts` (Task 8 Step 3b).

- [ ] **Step 1: `LeaderboardPage.tsx`** — osu!-rankings-style table. State: `countryCode` (undefined = Global), `offset`. Data: `useQuery(api.leaderboard.page, { countryCode, offset })`, `useQuery(api.leaderboard.countries)`. Layout: `<NavBar />`, heading "performance ranking", a `<select>` (Global + one option per country, resets offset on change), table with columns `# / player / accuracy / play count / pp` (rank bold; player = avatar 28px + flag emoji + name linking to `/u/${osuId}`; accuracy `xx.xx%`; pp rounded). Prev/next buttons stepping offset by 50, disabled at bounds (`offset + 50 >= total`). Empty state: "no scores yet — go set one!". Split the row into `LeaderboardRow.tsx`. Keep each file <150 lines.

- [ ] **Step 2: Route it** — in `AppRoutes.tsx`: `<Route path="/leaderboard" element={<LeaderboardPage />} />` (NavBar lives inside the page).

- [ ] **Step 3: Manual verification** — with dev data: global list renders, country filter narrows to your country, pagination disabled correctly, links navigate to (placeholder) profile. Dark full-bleed styling consistent with the game (reuse `.panel`). `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 4: Commit + PR** — `feat: global and country leaderboard page`; PR "airosu online M3: leaderboards" based on `v2.1-scores`.

---

# Milestone 4 — Profile page + real-osu! comparison (branch `v2.3-profile`, from `v2.2-leaderboard`)

### Task 12: Profile queries + osu! stat sync

**Files:**
- Create: `convex/profile.ts`
- Modify: `convex/osuApi.ts` (add `syncOsuStats` + `patchOsuStats`), `convex/users.ts` (nothing — `me` already exists)

**Interfaces:**
- Produces:
  - `api.profile.byOsuId` query `{ osuId: number } → null | { user: {...public fields incl. osuPp/osuGlobalRank/osuStatsSyncedAt}, globalRank, countryRank, topPlays: PlayRow[], recentPlays: PlayRow[] }` where `PlayRow = { scoreId, pp, weight (topPlays only), accuracy, grade, maxCombo, inputMode, forgiveness, cursorAnchor, playedAt, map: { title, artist, version, starRating, coverUrl?, rankedStatus?, osuBeatmapId?, osuBeatmapSetId? } }`
  - `api.osuApi.syncOsuStats` action `{ osuId: number } → void` (server-throttled to 1/24h per user)
- Consumes: `userRanks` (Task 10), `osuToken` (Task 6).

- [ ] **Step 1: `convex/profile.ts`**:

```ts
import { v } from 'convex/values';
import { query } from './_generated/server';
import { userRanks } from './leaderboard';

export const byOsuId = query({
  args: { osuId: v.number() },
  handler: async (ctx, { osuId }) => {
    const user = await ctx.db
      .query('users').withIndex('by_osuId', (q) => q.eq('osuId', osuId)).unique();
    if (!user) return null;

    const joinMap = async (s: any, weight?: number) => {
      const map = await ctx.db.get(s.mapId);
      return {
        scoreId: s._id, pp: s.pp, weight, accuracy: s.accuracy, grade: s.grade,
        maxCombo: s.maxCombo, inputMode: s.inputMode, forgiveness: s.forgiveness,
        cursorAnchor: s.cursorAnchor,
        playedAt: s._creationTime,
        map: map && {
          title: map.title, artist: map.artist, version: map.version,
          starRating: map.starRating, coverUrl: map.coverUrl,
          rankedStatus: map.rankedStatus, osuBeatmapId: map.osuBeatmapId,
          osuBeatmapSetId: map.osuBeatmapSetId,
        },
      };
    };

    const best = await ctx.db
      .query('scores')
      .withIndex('by_user_best', (q) => q.eq('userId', user._id).eq('isBest', true))
      .order('desc')
      .take(50);
    const topPlays = await Promise.all(best.map((s, i) => joinMap(s, Math.pow(0.95, i))));

    const recent = await ctx.db
      .query('scores')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(20);
    const recentPlays = await Promise.all(recent.map((s) => joinMap(s)));

    const ranks = await userRanks(ctx, user);
    return {
      user: {
        osuId: user.osuId, name: user.name, image: user.image,
        countryCode: user.countryCode, countryName: user.countryName,
        totalPp: user.totalPp ?? 0, playCount: user.playCount ?? 0,
        hitAccuracy: user.hitAccuracy ?? 0,
        osuPp: user.osuPp, osuGlobalRank: user.osuGlobalRank,
        osuStatsSyncedAt: user.osuStatsSyncedAt,
      },
      ...ranks, topPlays, recentPlays,
    };
  },
});
```

- [ ] **Step 2: Add to `convex/osuApi.ts`** — public throttled sync of the player's real osu! stats via `GET /api/v2/users/{id}/osu` (public scope, no user token):

```ts
export const syncOsuStats = action({
  args: { osuId: v.number() },
  handler: async (ctx, { osuId }) => {
    const user = await ctx.runQuery(internal.osuApi.userByOsuId, { osuId });
    if (!user) return;
    if (user.osuStatsSyncedAt && Date.now() - user.osuStatsSyncedAt < 24 * 60 * 60 * 1000) return;
    try {
      const token = await osuToken();
      const res = await fetch(`https://osu.ppy.sh/api/v2/users/${osuId}/osu`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`users ${res.status}`);
      const u = await res.json();
      await ctx.runMutation(internal.osuApi.patchOsuStats, {
        userId: user._id,
        osuPp: u.statistics?.pp ?? 0,
        osuGlobalRank: u.statistics?.global_rank ?? undefined,
      });
    } catch {
      // best effort — profile shows stale/absent comparison
    }
  },
});

export const userByOsuId = internalQuery({
  args: { osuId: v.number() },
  handler: (ctx, { osuId }) =>
    ctx.db.query('users').withIndex('by_osuId', (q) => q.eq('osuId', osuId)).unique(),
});

export const patchOsuStats = internalMutation({
  args: { userId: v.id('users'), osuPp: v.number(), osuGlobalRank: v.optional(v.number()) },
  handler: async (ctx, { userId, ...patch }) => {
    await ctx.db.patch(userId, { ...patch, osuStatsSyncedAt: Date.now() });
  },
});
```

(Imports: `action`, `internalQuery`, `internalMutation` from `./_generated/server`, `internal` already imported.)

- [ ] **Step 3: Deploy + verify** — `pnpm dlx convex dev --once`; `pnpm dlx convex run profile:byOsuId '{"osuId": <your id>}'` returns user + plays; `pnpm dlx convex run osuApi:syncOsuStats '{"osuId": <your id>}'` populates `osuPp`. Commit: `feat: profile query and real-osu stat sync`

### Task 13: Profile page UI

**Files:**
- Create: `src/ui/profile/ProfilePage.tsx`, `src/ui/profile/ProfileHeader.tsx`, `src/ui/profile/PlayRow.tsx`, `src/ui/profile/index.ts`
- Modify: `src/ui/AppRoutes.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `api.profile.byOsuId`, `api.osuApi.syncOsuStats`, `flagEmoji` from `src/ui/shared/flag.ts` (Task 8), `gradeColor` (`src/ui/results/grade.ts`), route param `osuId`.

- [ ] **Step 1: `ProfilePage.tsx`** — `useParams()` → `osuId = Number(params.osuId)`; guard NaN → "player not found". `useQuery(api.profile.byOsuId, { osuId })`; `null` → not found; `undefined` → loading. On mount (and only when data present + `osuStatsSyncedAt` missing or >24h old) fire `useAction(api.osuApi.syncOsuStats)({ osuId })` once. Layout: `<NavBar />` + `<ProfileHeader />` + "Best performance" section (topPlays → `<PlayRow withWeight />`) + "Recent plays" section (recentPlays → `<PlayRow />`, empty state "no plays yet").

- [ ] **Step 2: `ProfileHeader.tsx`** — big avatar, `flagEmoji(countryCode)` + name, stat tiles: `#globalRank` / `countryFlag #countryRank` / `Math.round(totalPp)pp` / play count / `(hitAccuracy*100).toFixed(2)%`. Comparison line when `osuPp` present: `real osu!: {osuPp}pp (#{osuGlobalRank}) · airosu: {totalPp}pp`. Keep <150 lines.

- [ ] **Step 3: `PlayRow.tsx`** — one row per play: left cover thumbnail (`map.coverUrl` if set, else the panel background), map `title [version]` + `artist` (when both IDs exist, link to `https://osu.ppy.sh/beatmapsets/{osuBeatmapSetId}#osu/{osuBeatmapId}`), star badge (reuse `src/ui/home/starColor.ts`), ranked-status badge when `rankedStatus === 'ranked' || 'loved' || 'approved'`, grade letter colored by `gradeColor`, accuracy, `{maxCombo}x`, settings badge when non-default (`inputMode !== 'relax' || forgiveness !== 1.5 || cursorAnchor !== 'palm'` → e.g. `manual · index · 1.0×`), right-aligned `pp` and (topPlays only) `weighted {Math.round(pp * weight)}pp ({Math.round(weight * 100)}%)`.

- [ ] **Step 4: Route + verify** — replace the `/u/:osuId` placeholder. Manual: own profile from navbar shows header stats matching dashboard, top plays sorted by pp with weights 100%, 95%, …; osu! comparison appears after sync; unknown osuId shows not-found. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit + PR** — `feat: osu-style profile page`; PR "airosu online M4: profiles" based on `v2.2-leaderboard`.

---

# Milestone 5 — Local map library + osu! URL assistance (branch `v2.4-map-library`, from `v2.3-profile`)

### Task 14: IndexedDB library module — TDD

**Files:**
- Create: `src/beatmap/library.ts`, `src/beatmap/library.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LibraryEntry { id: string; label: string; addedAt: number; byteLength: number; difficultyCount: number }
export function saveMapset(bytes: Uint8Array, label: string, difficultyCount: number): Promise<LibraryEntry>  // id = sha-256 hex of bytes; overwrites duplicates
export function listMapsets(): Promise<LibraryEntry[]>                               // newest first, no bytes
export function getMapsetBytes(id: string): Promise<Uint8Array | undefined>
export function deleteMapset(id: string): Promise<void>
```

All functions swallow storage failures per spec? **No** — they throw; the *UI* catches and degrades (Task 15). DB `airosu-library` v1, stores `meta` (LibraryEntry by id) and `files` ({ id, bytes } by id).

- [ ] **Step 1: Install**:

```bash
pnpm add idb
pnpm add -D fake-indexeddb
```

- [ ] **Step 2: Write `src/beatmap/library.test.ts`** (failing first):

```ts
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteMapset, getMapsetBytes, listMapsets, saveMapset } from './library';

const bytes = (s: string) => new TextEncoder().encode(s);

describe('map library', () => {
  beforeEach(async () => {
    for (const e of await listMapsets()) await deleteMapset(e.id);
  });

  it('round-trips a mapset', async () => {
    const entry = await saveMapset(bytes('osz-bytes'), 'Artist — Title', 3);
    expect(entry.id).toMatch(/^[0-9a-f]{64}$/);
    const listed = await listMapsets();
    expect(listed).toHaveLength(1);
    expect(listed[0].label).toBe('Artist — Title');
    expect(listed[0].difficultyCount).toBe(3);
    expect(listed[0].byteLength).toBe(bytes('osz-bytes').byteLength);
    expect(await getMapsetBytes(entry.id)).toEqual(bytes('osz-bytes'));
  });

  it('dedupes identical bytes', async () => {
    await saveMapset(bytes('same'), 'first', 1);
    await saveMapset(bytes('same'), 'second', 1);
    expect(await listMapsets()).toHaveLength(1);
  });

  it('lists newest first and deletes', async () => {
    const a = await saveMapset(bytes('a'), 'A', 1);
    await new Promise((r) => setTimeout(r, 5));
    await saveMapset(bytes('b'), 'B', 2);
    expect((await listMapsets()).map((e) => e.label)).toEqual(['B', 'A']);
    await deleteMapset(a.id);
    expect(await getMapsetBytes(a.id)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run** — FAILS. **Step 4: Implement `src/beatmap/library.ts`**:

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface LibraryEntry {
  id: string;
  label: string;
  addedAt: number;
  byteLength: number;
  difficultyCount: number;
}

interface LibraryDB extends DBSchema {
  meta: { key: string; value: LibraryEntry };
  files: { key: string; value: { id: string; bytes: Uint8Array } };
}

let dbPromise: Promise<IDBPDatabase<LibraryDB>> | undefined;

function db(): Promise<IDBPDatabase<LibraryDB>> {
  dbPromise ??= openDB<LibraryDB>('airosu-library', 1, {
    upgrade(d) {
      d.createObjectStore('meta', { keyPath: 'id' });
      d.createObjectStore('files', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes.slice().buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function saveMapset(
  bytes: Uint8Array,
  label: string,
  difficultyCount: number,
): Promise<LibraryEntry> {
  const id = await sha256Hex(bytes);
  const entry: LibraryEntry = { id, label, addedAt: Date.now(), byteLength: bytes.byteLength, difficultyCount };
  const d = await db();
  const tx = d.transaction(['meta', 'files'], 'readwrite');
  await tx.objectStore('meta').put(entry);
  await tx.objectStore('files').put({ id, bytes });
  await tx.done;
  return entry;
}

export async function listMapsets(): Promise<LibraryEntry[]> {
  const d = await db();
  const all = await d.getAll('meta');
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getMapsetBytes(id: string): Promise<Uint8Array | undefined> {
  const d = await db();
  return (await d.get('files', id))?.bytes;
}

export async function deleteMapset(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['meta', 'files'], 'readwrite');
  await tx.objectStore('meta').delete(id);
  await tx.objectStore('files').delete(id);
  await tx.done;
}
```

- [ ] **Step 5: Run** `pnpm test src/beatmap/library.test.ts` — PASS (fake-indexeddb provides `indexedDB`; vitest node env provides `crypto.subtle`). Commit: `feat: IndexedDB map library module`

### Task 15: "Your maps" UI

**Files:**
- Create: `src/ui/home/YourMaps.tsx`, `src/ui/home/useLibrary.ts`
- Modify: `src/ui/home/MapLoadScreen.tsx` (save uploads; render YourMaps under the drop zone), `src/ui/home/index.ts`

**Interfaces:**
- Consumes: library module (Task 14), `openMapset` callback in MapLoadScreen.
- Produces: `useLibrary(): { entries: LibraryEntry[]; save(bytes, label, difficultyCount): Promise<void>; remove(id): Promise<void>; open(id): Promise<Uint8Array | undefined>; unavailable: boolean }` — every method try/catches; failures set `unavailable` and leave the session working in-memory (today's behavior).

- [ ] **Step 1: `useLibrary.ts`** — state `entries: LibraryEntry[]`, `unavailable: boolean`; `useEffect` on mount calls `listMapsets()` (catch → `unavailable = true`); `save` calls `saveMapset` then refreshes entries (catch → `unavailable = true`, don't rethrow — upload continues in-memory); `remove` deletes + refreshes; `open` returns `getMapsetBytes(id)`.

- [ ] **Step 2: Wire uploads** — in `MapLoadScreen.handleFile`, compute `const difficultyCount = listDifficulties(bytes).length`; after a successful `openMapset(bytes, label)` for a `.osz`, call `void library.save(bytes, label, difficultyCount)` (fire-and-forget; `.osu` single files skip the library).

- [ ] **Step 3: `YourMaps.tsx`** — when `unavailable`, render the muted warning "browser storage unavailable — uploads won't persist"; otherwise render nothing when `entries.length === 0`. With entries, show an eyebrow heading "your maps" + rows (label, difficulty count, readable file size, added date, ✕ delete button with `confirm()`); click row → `open(id)` → `openMapset(bytes, entry.label)`. Mount below the drop-zone label in MapLoadScreen (only in the `!mapset` branch). Keep <100 lines.

- [ ] **Step 4: Manual verification** — upload an `.osz`, reload the page → it's under "your maps"; click → difficulty picker opens; delete removes it after reload too; private-browsing (or DevTools → Application → block storage) still lets you upload and play. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit** — `feat: persistent local map library`.

### Task 16: Official osu! URL-assisted import

Automatic download is deliberately excluded: the official beatmapset download
API is a `lazer` route, and osu! documents that `lazer` routes are unavailable
to third-party authorization-code/client-credentials apps. This task resolves
the URL and exact difficulty, sends the user to the official page to download,
then resumes through the normal local `.osz` picker. No mirror or scraping.

**Files:**
- Create: `src/beatmap/acquisition/osuUrl.ts`, `src/beatmap/acquisition/osuUrl.test.ts`, `src/beatmap/acquisition/index.ts`, `src/ui/home/OsuUrlImport.tsx`
- Modify: `convex/osuApi.ts`, `src/beatmap/load.ts`, `src/beatmap/load.test.ts`, `src/ui/home/MapLoadScreen.tsx`, `src/ui/home/index.ts`, `README.md`

**Interfaces:**

```ts
export type OsuUrlTarget =
  | { kind: 'beatmapset'; id: number }
  | { kind: 'beatmap'; id: number };

export function parseOsuUrl(input: string): OsuUrlTarget | null;
export function beatmapIdFromOsuText(osuText: string): number | null;
export function findDifficultyByBeatmapId(
  entries: { difficultyName: string; osuText: string }[],
  beatmapId: number,
): string | null;
```

`api.osuApi.resolveBeatmapSource` accepts `OsuUrlTarget` and returns:

```ts
{
  beatmapsetId: number;
  beatmapId?: number;
  artist: string;
  title: string;
  creator: string;
  coverUrl?: string;
  status: string;
  pageUrl: string;
}
```

- [ ] **Step 1: Write URL parser tests**:

```ts
import { describe, expect, it } from 'vitest';
import { parseOsuUrl } from './osuUrl';

describe('parseOsuUrl', () => {
  it('accepts canonical beatmapset and beatmap URLs', () => {
    expect(parseOsuUrl('https://osu.ppy.sh/beatmapsets/123#osu/456'))
      .toEqual({ kind: 'beatmap', id: 456 });
    expect(parseOsuUrl('https://osu.ppy.sh/beatmapsets/123'))
      .toEqual({ kind: 'beatmapset', id: 123 });
    expect(parseOsuUrl('https://osu.ppy.sh/beatmaps/456'))
      .toEqual({ kind: 'beatmap', id: 456 });
  });
  it('rejects non-osu hosts, non-https URLs and unrelated paths', () => {
    expect(parseOsuUrl('https://mirror.example/beatmapsets/123')).toBeNull();
    expect(parseOsuUrl('http://osu.ppy.sh/beatmapsets/123')).toBeNull();
    expect(parseOsuUrl('https://osu.ppy.sh/users/123')).toBeNull();
  });
});
```

Run → FAIL, then implement with `new URL(input.trim())`, exact host
`osu.ppy.sh`, protocol `https:`, positive safe-integer IDs, canonical
`/beatmapsets/:id` and `/beatmaps/:id` paths, and optional `#osu/:beatmapId`.
Do not accept or rewrite mirror URLs.

- [ ] **Step 2: Add exact-difficulty matching tests** — in `load.test.ts`, use two synthetic `.osu` texts containing `BeatmapID:111` / `BeatmapID:222`; assert `beatmapIdFromOsuText` returns the ID and `findDifficultyByBeatmapId(entries, 222)` returns the second difficulty. Implement by matching the metadata line `/^BeatmapID\s*:\s*(\d+)\s*$/m`; return `null` for missing/invalid IDs.

- [ ] **Step 3: Add the Convex resolver** — in `convex/osuApi.ts`, add an authenticated public action:

```ts
async function osuJson(url: string, token: string): Promise<Record<string, any>> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (response.status === 404) throw new ConvexError('osu! map not found');
  if (!response.ok) throw new ConvexError('osu! lookup is temporarily unavailable');
  return await response.json() as Record<string, any>;
}

export const resolveBeatmapSource = action({
  args: {
    kind: v.union(v.literal('beatmapset'), v.literal('beatmap')),
    id: v.number(),
  },
  handler: async (ctx, { kind, id }) => {
    if (!(await getAuthUserId(ctx))) throw new ConvexError('sign in to resolve osu! URLs');
    if (!Number.isSafeInteger(id) || id <= 0) throw new ConvexError('invalid osu! id');
    const token = await osuToken();
    let beatmapId: number | undefined;
    let beatmapsetId = id;
    if (kind === 'beatmap') {
      const beatmap = await osuJson(`https://osu.ppy.sh/api/v2/beatmaps/${id}`, token);
      beatmapId = beatmap.id;
      beatmapsetId = beatmap.beatmapset_id;
    }
    const set = await osuJson(
      `https://osu.ppy.sh/api/v2/beatmapsets/${beatmapsetId}`,
      token,
    );
    return {
      beatmapsetId, beatmapId,
      artist: set.artist, title: set.title, creator: set.creator,
      coverUrl: set.covers?.['cover@2x'] ?? set.covers?.cover,
      status: set.status ?? 'unknown',
      pageUrl: beatmapId
        ? `https://osu.ppy.sh/beatmapsets/${beatmapsetId}#osu/${beatmapId}`
        : `https://osu.ppy.sh/beatmapsets/${beatmapsetId}`,
    };
  },
});
```

Import `action`, `getAuthUserId`, and `ConvexError`. Verify the response field
names against the installed/current official API response before committing.
Do not add a download request or token field to the return value.

- [ ] **Step 4: Build `OsuUrlImport.tsx`** — signed-out state explains that osu!
sign-in is needed for lookup but leaves upload/starter maps usable. Signed-in
state has a URL input and Resolve button. On success show cover, artist/title,
mapper/status, then an external `<a target="_blank" rel="noreferrer">Open on
osu! to download</a>` pointing only to returned `pageUrl`, plus a file input
labelled “Choose the downloaded .osz”. Display this honest note: “osu! does not
offer third-party apps an automatic beatmap download API, so your browser must
download the file from osu! first.”

- [ ] **Step 5: Resume the existing loader** — mount the component beside the
drop zone. Refactor `handleFile(file, preferredBeatmapId?)`; URL-assisted file
selection passes the resolved `beatmapId`. After `listDifficulties`, call
`findDifficultyByBeatmapId`; if found, set `pickedName` and load it immediately;
otherwise show the normal difficulty picker. The successful `.osz` still saves
to IndexedDB through Task 15.

- [ ] **Step 6: Verify supported and unsupported paths** — manually test a
beatmapset URL and a difficulty URL while signed in, confirm metadata is exact,
the official page opens, selecting the downloaded file imports it, and a
difficulty URL preselects its difficulty. Test signed-out, invalid URL, 404,
offline Convex, and wrong `.osz`; local upload/starter play must remain usable.
Run `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 7: Document and commit** — README says URL import is assisted, not
automatic, links the official API limitation, and promises no mirrors/scraping.
Commit `feat: add official osu url-assisted import`; push and open PR “airosu
online M5: local and osu! URL map library” based on `v2.3-profile`.

---

## Final integration checklist (after M5 merges)

- [ ] Full manual pass on dev: play a licensed starter map without importing → play once with palm and once with index → sign in → submit → leaderboard rank → profile top plays → paste an osu! URL → open the official page → choose the downloaded `.osz` → play + submit → reload, library persists.
- [ ] Repeat one submit with the same `playId` and confirm one score/play-count increment; complete a slider map and confirm its score passes `judgmentCount` validation.
- [ ] `pnpm run verify:starter-maps && pnpm build`; confirm every production `.osz` matches the approved manifest and no `game-assets/test-maps` fixture appears in `dist`.
- [ ] Confirm URL import never calls a mirror or download API, never returns a token, and clearly requires the user to download/select the file from osu!.
- [ ] Production bring-up (repo owner, Human prerequisite 4): prod deployment, production-only osu! OAuth client/env vars, Vercel `VITE_CONVEX_URL`; verify sign-in on airosu.ycells.com.
- [ ] Update the README's setup, architecture, privacy/data-storage summary, and relevant design/plan links.

## Deviations from spec (intentional)

- `LoadedBeatmap.meta` does **not** gain `md5`/`beatmapId`/`objectCount`: the server derives all of them from the submitted `.osu` text in `registerMap`, so the client never needs them (YAGNI).
- Client-side md5 (spark-md5) dropped for the same reason; the local library keys by WebCrypto SHA-256 instead.
- `countries` table added (not in spec's table list) to power the filter dropdown without scanning users.
- `judgmentCount` is stored separately from osu! `objectCount` because the existing airosu engine emits two score judgments for sliders.
- `playId` is stored on scores so automatic submission and retries are idempotent.
- Bundled maps remain for onboarding, but the broad fixture glob is replaced by a narrow manifest-approved starter-map glob; all other maps are test-only or local.
- osu! URL import is guided rather than automatic because the official download route is unavailable to third-party OAuth applications.
- Palm and index share PP v1; `cursorAnchor` is stored on scores so a future version can change this deliberately and recalculate.
