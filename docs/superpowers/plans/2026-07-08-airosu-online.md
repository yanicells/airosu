# airosu online (v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** osu! sign-in, server-verified score submission with pp, global/country leaderboards, osu!-style profile pages, and a persistent local map library.

**Architecture:** Convex is the backend (database + auth + actions). Auth is Convex Auth with the built-in Auth.js osu! provider — osu! OAuth is the only sign-in. The client sends raw `.osu` text (map registration) and raw hit stats (score submission); the server recomputes difficulty attributes and pp itself using the same pure TypeScript formula module the client uses for live pp, versioned with `PP_VERSION` so formula changes can be replayed over stored stats with `@convex-dev/migrations`. Leaderboard ranks come from `@convex-dev/aggregate`. Uploaded `.osz` files persist in IndexedDB — no map audio ever leaves the browser.

**Tech Stack:** Vite + React 19 + TypeScript, Convex, `@convex-dev/auth` + `@auth/core` (osu! provider), `@convex-dev/aggregate`, `@convex-dev/migrations`, `react-router` (library mode), `idb`, osu-parsers/osu-standard-stable (already installed), vitest.

**Spec:** `docs/superpowers/specs/2026-07-08-airosu-online-design.md`

## Global Constraints

- pnpm always — never npm or yarn. Use `pnpm add`, `pnpm dlx`, `pnpm test`.
- TypeScript everywhere. Feature folders under `src/ui/<screen>/` with an `index.ts` barrel; split components past ~150 lines.
- TDD for all pure logic. UI verified manually via `pnpm run dev`.
- Conventional commits. Commit after every green test cycle.
- Stacked PRs: one branch + PR per milestone, each branched from the previous (`v2.0-online-auth` → `v2.1-scores` → `v2.2-leaderboard` → `v2.3-profile` → `v2.4-map-library`).
- Never ship copyrighted audio or `.osz` fixtures in the deployed bundle. Never upload audio or `.osz` bytes to Convex — only `.osu` **text**.
- Never add Vercel deploy automation. Production deploy notes are documentation only.
- Verify installed package APIs at install time; if reality differs from this plan (Convex Auth, aggregate, migrations APIs move), **trust the installed library**, adapt, and note the deviation in the PR description.
- Use the `vercel-react-best-practices` skill when writing React/TSX; `frontend-design` for UI polish; `convex-migration-helper` skill when touching migrations; `convex-setup-auth` skill during Milestone 1.
- The game must remain fully playable signed-out and offline. No online call may block the play loop.

## Human prerequisites (repo owner — do these before/during Milestone 1)

1. **Convex project**: run `pnpm dlx convex dev` once and complete the interactive login/project creation. This writes `CONVEX_DEPLOYMENT` to `.env.local` and prints the deployment URL (`https://<name>.convex.cloud`) and site URL (`https://<name>.convex.site`).
2. **osu! OAuth client**: at <https://osu.ppy.sh/home/account/edit#oauth> click "New OAuth Application". Name: `airosu`. Application Callback URL: `https://<name>.convex.site/api/auth/callback/osu` (the dev deployment's site URL; add the prod deployment's callback later — osu! allows editing). Save the Client ID and Client Secret.
3. **Convex env vars** (dev deployment): 
   ```bash
   pnpm dlx convex env set AUTH_OSU_ID <client id>
   pnpm dlx convex env set AUTH_OSU_SECRET <client secret>
   pnpm dlx convex env set SITE_URL http://localhost:5173
   ```
4. **Production checklist** (later, manual, no automation): create a prod Convex deployment via `pnpm dlx convex deploy`, set the same three env vars on it (`SITE_URL=https://airosu.ycells.com`), add the prod callback URL to the osu! OAuth app, and set `VITE_CONVEX_URL` in Vercel project settings to the prod deployment URL.

---

# Milestone 1 — Convex, routing, osu! sign-in (branch `v2.0-online-auth`)

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
pnpm add convex react-router
```

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

(`@convex-dev/auth` is installed in Task 2 — finish Step 5/6 after Task 2 Step 1 if the import blocks the build; or install both packages now: `pnpm add @convex-dev/auth @auth/core@0.37.0`.)

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

- [ ] **Step 1: Install and initialize** — follow the `convex-setup-auth` skill and https://labs.convex.dev/auth/setup for the current procedure. Baseline commands:

```bash
pnpm add @convex-dev/auth @auth/core@0.37.0
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
        <img src={me.image} alt="" width={28} height={28} style={{ borderRadius: '50%' }} />
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

- [ ] **Step 5: Commit and open PR** — `feat: auth navbar and sign-in UI`. Push branch, open PR "airosu online M1: convex + osu! sign-in" per the finishing-a-development-branch skill.

---

# Milestone 2 — pp formula module, map registry, score submission (branch `v2.1-scores`, from `v2.0-online-auth`)

### Task 4: Extract pure pp formula (`ppFormula.ts`) — TDD

**Files:**
- Create: `src/game/ppFormula.ts`, `src/game/ppFormula.test.ts`, `src/game/grade.ts`
- Modify: `src/game/pp.ts` (delegate math), `src/ui/results/grade.ts` (re-export from game), `src/ui/results/ResultsScreen.tsx` + any `grade` importers (import path unchanged via re-export — verify)

**Interfaces:**
- Produces (used by convex functions and PpCounter):
  - `PP_VERSION: number` (starts at `1` — the current live formula)
  - `interface HitStats { count300: number; count100: number; count50: number; countMiss: number; maxCombo: number }` (moves here from `pp.ts`; `pp.ts` re-exports it)
  - `judgedCount(s: HitStats): number`
  - `accuracyOf(s: HitStats): number` — 0 when nothing judged
  - `playPp(worth: { ssPp: number; starRating: number }, s: HitStats): number`
  - `src/game/grade.ts`: `type Grade`, `grade(accuracy: number): Grade` (moved from `src/ui/results/grade.ts`; colors/labels stay in the UI file)

- [ ] **Step 1: Write `src/game/ppFormula.test.ts`** (failing first):

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

- [ ] **Step 2: Run** `pnpm test src/game/ppFormula.test.ts` — FAILS (module not found).

- [ ] **Step 3: Implement `src/game/ppFormula.ts`** — lift the math verbatim from `pp.ts` lines 62–87 (quality curve, handicap) into pure functions. **This module must stay dependency-free** (no osu-* imports) — it is imported by Convex functions:

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

- [ ] **Step 4: Refactor `src/game/pp.ts`** — delete the duplicated math; keep the lazer ssPp computation:

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

- [ ] **Step 5: Move grade** — create `src/game/grade.ts` with `Grade` + `grade()` copied from `src/ui/results/grade.ts`; change the UI file to `export { grade, type Grade } from '../../game/grade';` keeping `gradeColor`/`judgmentColors`/`judgmentLabels` where they are.

- [ ] **Step 6: Run everything** — `pnpm test` (all suites incl. existing `pp.test.ts` must still pass — the refactor must not change any number) and `pnpm lint && pnpm build`.

- [ ] **Step 7: Commit** — `refactor: extract versioned pp formula and grade into pure shared modules`

### Task 5: Server-side map attributes helper — TDD

**Files:**
- Create: `src/beatmap/attributes.ts`, `src/beatmap/attributes.test.ts`

**Interfaces:**
- Produces: `computeMapAttributes(osuText: string): MapAttributes` where

```ts
export interface MapAttributes {
  title: string; artist: string; version: string; creator: string;
  bpm: number; lengthMs: number; cs: number; ar: number; od: number; hp: number;
  starRating: number; maxCombo: number; objectCount: number; ssPp: number;
  beatmapId?: number; beatmapSetId?: number;
}
```

- Consumes: `toInternal` from `src/beatmap/adapter.ts` (meta + objects), osu-standard-stable ruleset. Runs in the Convex Node action (Task 6) and in vitest — must not touch DOM APIs.

- [ ] **Step 1: Write `src/beatmap/attributes.test.ts`** using the existing fixture pattern (`src/beatmap/load.test.ts` reads `game-assets/maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz`):

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { listDifficulties } from './load';
import { computeMapAttributes } from './attributes';

const osz = new Uint8Array(readFileSync('game-assets/maps/444335 HO-KAGO TEA TIME - Kira Kira Days.osz'));
const easy = listDifficulties(osz).find((d) => /easy/i.test(d.difficultyName))!;

describe('computeMapAttributes', () => {
  it('extracts metadata, difficulty and worth', () => {
    const a = computeMapAttributes(easy.osuText);
    expect(a.title.length).toBeGreaterThan(0);
    expect(a.objectCount).toBeGreaterThan(0);
    expect(a.maxCombo).toBeGreaterThanOrEqual(a.objectCount);
    expect(a.starRating).toBeGreaterThan(0);
    expect(a.starRating).toBeLessThan(3);
    expect(a.ssPp).toBeGreaterThan(0);
    expect(a.beatmapSetId).toBe(444335);
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

export interface MapAttributes {
  title: string; artist: string; version: string; creator: string;
  bpm: number; lengthMs: number; cs: number; ar: number; od: number; hp: number;
  starRating: number; maxCombo: number; objectCount: number; ssPp: number;
  beatmapId?: number; beatmapSetId?: number;
}

/** Authoritative map attributes computed server-side at registration. */
export function computeMapAttributes(osuText: string): MapAttributes {
  const parsed = decoder.decodeFromString(osuText, { parseStoryboard: false });
  const internal = toInternal(parsed, osuText, new ArrayBuffer(0));
  const beatmap = ruleset.applyToBeatmap(parsed);
  const attributes = ruleset.createDifficultyCalculator(beatmap).calculate();

  const perfect = new ScoreInfo();
  perfect.ruleset = ruleset;
  perfect.maxCombo = attributes.maxCombo;
  perfect.count300 = internal.objects.length;
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
    ssPp: Number.isFinite(ssPp) ? ssPp : 0,
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
  - `convex/lib/scoring.ts`: `validateSubmission(map: { objectCount: number }, s: HitStats): string | null` (error string or null when valid) and `scoreDerived(map: { ssPp: number; starRating: number }, s: HitStats): { accuracy: number; grade: Grade; pp: number; ppVersion: number }` and `weightedTotals(best: { pp: number; accuracy: number }[]): { totalPp: number; hitAccuracy: number }` (0.95ⁱ weights, top 100)
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
  ssPp: v.number(),
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
  inputMode: v.string(), // 'relax' | 'manual'
  forgiveness: v.number(),
})
  .index('by_user_map', ['userId', 'mapId'])
  .index('by_map_best', ['mapId', 'isBest', 'pp'])
  .index('by_user_best', ['userId', 'isBest', 'pp'])
  .index('by_user', ['userId']),
```

- [ ] **Step 2: Write `src/game/scoring.test.ts`** (failing first):

```ts
import { describe, expect, it } from 'vitest';
import { PP_VERSION } from './ppFormula';
import { scoreDerived, validateSubmission, weightedTotals } from '../../convex/lib/scoring';

const map = { objectCount: 100, ssPp: 100, starRating: 3 };
const ss = { count300: 100, count100: 0, count50: 0, countMiss: 0, maxCombo: 100 };

describe('validateSubmission', () => {
  it('accepts a full clean play', () => expect(validateSubmission(map, ss)).toBeNull());
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
export function validateSubmission(map: { objectCount: number }, s: HitStats): string | null {
  const counts = [s.count300, s.count100, s.count50, s.countMiss, s.maxCombo];
  if (counts.some((c) => !Number.isInteger(c) || c < 0)) return 'invalid counts';
  if (judgedCount(s) !== map.objectCount) return 'judgment counts do not match the map';
  if (s.maxCombo > map.objectCount) return 'combo exceeds map maximum';
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

export const insert = internalMutation({
  args: {
    md5: v.string(), osuFileId: v.id('_storage'),
    title: v.string(), artist: v.string(), version: v.string(), creator: v.string(),
    bpm: v.number(), lengthMs: v.number(),
    cs: v.number(), ar: v.number(), od: v.number(), hp: v.number(),
    starRating: v.number(), maxCombo: v.number(), objectCount: v.number(), ssPp: v.number(),
    osuBeatmapId: v.optional(v.number()), osuBeatmapSetId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('maps').withIndex('by_md5', (q) => q.eq('md5', args.md5)).unique();
    if (existing) return existing._id; // registration raced — keep first
    return await ctx.db.insert('maps', args);
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
import { computeMapAttributes } from '../src/beatmap/attributes';

/** Registers a difficulty by its .osu text. Idempotent by md5. Returns mapId. */
export const registerMap = action({
  args: { osuText: v.string() },
  handler: async (ctx, { osuText }) => {
    const md5 = createHash('md5').update(osuText, 'utf8').digest('hex');
    const existing = await ctx.runQuery(internal.maps.byMd5, { md5 });
    if (existing) {
      if (!existing.rankedStatus) {
        await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId: existing._id, md5 });
      }
      return existing._id;
    }
    const a = computeMapAttributes(osuText);
    const osuFileId = await ctx.storage.store(new Blob([osuText], { type: 'text/plain' }));
    const mapId = await ctx.runMutation(internal.maps.insert, {
      md5, osuFileId,
      title: a.title, artist: a.artist, version: a.version, creator: a.creator,
      bpm: a.bpm, lengthMs: a.lengthMs, cs: a.cs, ar: a.ar, od: a.od, hp: a.hp,
      starRating: a.starRating, maxCombo: a.maxCombo, objectCount: a.objectCount, ssPp: a.ssPp,
      osuBeatmapId: a.beatmapId, osuBeatmapSetId: a.beatmapSetId,
    });
    await ctx.scheduler.runAfter(0, internal.osuApi.enrichMap, { mapId, md5 });
    return mapId;
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
  args: { mapId: v.id('maps'), md5: v.string() },
  handler: async (ctx, { mapId, md5 }) => {
    try {
      const token = await osuToken();
      const res = await fetch(
        `https://osu.ppy.sh/api/v2/beatmaps/lookup?checksum=${encodeURIComponent(md5)}`,
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
- Create: `convex/scores.ts`
- Test: covered by `scoring.test.ts` (pure parts); handler smoke-tested in Task 8 via the app

**Interfaces:**
- Produces:
  - `api.scores.submit` mutation `{ mapId, count300, count100, count50, countMiss, maxCombo, score, inputMode, forgiveness } → { pp: number; isBest: boolean; grade: string; accuracy: number }`, throws `ConvexError('not signed in')` / `ConvexError('score could not be verified: <reason>')`
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
    mapId: v.id('maps'),
    count300: v.number(), count100: v.number(), count50: v.number(), countMiss: v.number(),
    maxCombo: v.number(), score: v.number(),
    inputMode: v.string(), forgiveness: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('not signed in');
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new ConvexError('unknown map');

    const stats = {
      count300: args.count300, count100: args.count100, count50: args.count50,
      countMiss: args.countMiss, maxCombo: args.maxCombo,
    };
    const invalid = validateSubmission(map, stats);
    if (invalid) throw new ConvexError(`score could not be verified: ${invalid}`);

    const derived = scoreDerived(map, stats);

    // previous best on this map (few docs per user+map — scan is fine)
    const onMap = await ctx.db
      .query('scores')
      .withIndex('by_user_map', (q) => q.eq('userId', userId).eq('mapId', args.mapId))
      .collect();
    const prevBest = onMap.find((s) => s.isBest);
    const isBest = !prevBest || derived.pp > prevBest.pp;
    if (isBest && prevBest) await ctx.db.patch(prevBest._id, { isBest: false });

    await ctx.db.insert('scores', {
      userId, mapId: args.mapId, ...stats,
      score: args.score, inputMode: args.inputMode, forgiveness: args.forgiveness,
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
          playedAt: s._creationTime,
          osuId: u?.osuId, name: u?.name, image: u?.image, countryCode: u?.countryCode,
        };
      }),
    );
  },
});
```

- [ ] **Step 2: Deploy** — `pnpm dlx convex dev --once` compiles. `pnpm test && pnpm lint` pass. Commit: `feat: score submission with server-side pp and per-map leaderboard query`

### Task 8: Results-screen submission UI

**Files:**
- Create: `src/online/useSubmitScore.ts`, `src/ui/results/SubmitPanel.tsx`, `src/ui/results/MapLeaderboard.tsx`, `src/ui/shared/flag.ts`, `src/ui/shared/flag.test.ts`
- Modify: `src/ui/appState.ts` (LastResult gains `inputMode`, `forgiveness`), the `setLastResult` call site in `src/ui/play/` (grep `setLastResult` — pass the two settings values from the active settings), `src/ui/results/ResultsScreen.tsx` (mount `<SubmitPanel />`), `src/ui/results/index.ts`

**Interfaces:**
- Consumes: `api.mapsNode.registerMap`, `api.scores.submit`, `api.users.me`, appState (`map.rawOsu`, `lastResult`).
- Produces: `useSubmitScore(): { status: 'signedOut'|'idle'|'submitting'|'done'|'error'; result?: { pp: number; isBest: boolean }; mapId?: Id<'maps'>; error?: string; submit(): void }` — auto-submits once on mount when signed in; `mapId` is set once registration succeeds and drives the per-map leaderboard.

- [ ] **Step 1: Extend LastResult** — in `appState.ts` add `inputMode: 'relax' | 'manual'; forgiveness: number;` to `LastResult`. Fix the producer (in the play screen, add `inputMode: settings.inputMode, forgiveness: settings.forgiveness`) and any test fixtures that construct `LastResult`.

- [ ] **Step 2: `src/online/useSubmitScore.ts`**:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
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
  const [error, setError] = useState<string>();
  const startedRef = useRef(false);

  const submit = useCallback(() => {
    if (!map || !lastResult || !me) return;
    setStatus('submitting');
    setError(undefined);
    void (async () => {
      try {
        const mapId = await registerMap({ osuText: map.rawOsu });
        const res = await submitScore({
          mapId,
          count300: lastResult.counts[300], count100: lastResult.counts[100],
          count50: lastResult.counts[50], countMiss: lastResult.counts[0],
          maxCombo: lastResult.maxCombo, score: lastResult.score,
          inputMode: lastResult.inputMode, forgiveness: lastResult.forgiveness,
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

(Track `mapId` in a `useState` set right after `await registerMap(...)` resolves inside `submit`.)

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

- [ ] **Step 3c: `src/ui/results/MapLeaderboard.tsx`** — per-map top plays, rendered under the SubmitPanel once `mapId` is known (spec: per-map leaderboard on results). `useQuery(api.scores.mapLeaderboard, mapId ? { mapId } : 'skip')`; render nothing while loading/empty; otherwise a compact list of the top 10: `#i · flagEmoji(countryCode)+name (link to /u/{osuId}) · grade · accuracy · pp`, highlighting the signed-in user's row. Keep <100 lines.

- [ ] **Step 4: Manual verification (full loop)** — `pnpm run dev`: signed out, finish a short play → prompt shown, game unaffected. Sign in, play again → "submitting…" then "+Xpp · personal best!". Convex dashboard: `maps` row exists (with `rankedStatus`/`coverUrl` arriving a moment later via enrichment — bundled maps are real osu! maps so lookup succeeds), `scores` row has `isBest: true`, user doc has `totalPp > 0`, `playCount: 1`. Play the same map worse → second score `isBest: false`, `totalPp` unchanged. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit** — `feat: auto-submit scores from results screen`

### Task 9: pp rework machinery (migrations + runbook)

**Files:**
- Create: `convex/convex.config.ts`, `convex/migrations.ts`, `docs/pp-rework-runbook.md`
- Modify: none

**Interfaces:**
- Consumes: `recomputeUserTotals` (Task 7), `scoreDerived` (Task 6), `PP_VERSION`.
- Produces: internal migrations `recalcScores`, `recalcBestFlags`, `recalcUsers`; runner `internal.migrations.runPpRework`.

Use the `convex-migration-helper` skill while implementing this task.

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

/** Phase 2: new formula may reorder a user's plays on a map — refresh isBest. */
export const recalcBestFlags = migrations.define({
  table: 'users',
  migrateOne: async (ctx, user) => {
    const scores = await ctx.db
      .query('scores')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const bestPerMap = new Map<string, (typeof scores)[number]>();
    for (const s of scores) {
      const cur = bestPerMap.get(s.mapId);
      if (!cur || s.pp > cur.pp) bestPerMap.set(s.mapId, s);
    }
    for (const s of scores) {
      const shouldBeBest = bestPerMap.get(s.mapId)?._id === s._id;
      if (s.isBest !== shouldBeBest) await ctx.db.patch(s._id, { isBest: shouldBeBest });
    }
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

(Scale note: `recalcBestFlags` collects all of one user's scores in one transaction — fine for thousands of scores per user; revisit if that assumption breaks.)

- [ ] **Step 3: `docs/pp-rework-runbook.md`**:

```markdown
# pp rework runbook

When the pp formula changes (anything in `src/game/ppFormula.ts`):

1. Change the math and **bump `PP_VERSION`**.
2. Update `src/game/ppFormula.test.ts` expectations; keep old-version tests as history if useful.
3. Deploy: `pnpm dlx convex dev --once` (dev) / `pnpm dlx convex deploy` (prod).
4. Run the recalculation: `pnpm dlx convex run migrations:runPpRework` (add `--prod` for production).
   It replays: score pp → isBest flags → user totals (+ leaderboard aggregates).
5. Verify: spot-check a user in the dashboard — `users.ppVersion === PP_VERSION`,
   leaderboard order changed as expected. Scores keep their `ppVersion`, so an
   interrupted run is resumable by rerunning step 4.

Never edit stored pp by hand: stored hit stats + map attributes are the source
of truth; pp is always derivable.
```

- [ ] **Step 4: Verify** — `pnpm dlx convex dev --once` deploys; run `pnpm dlx convex run migrations:runPpRework` against dev data from Task 8 and confirm it completes and totals are unchanged (same PP_VERSION → no-op). `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit + PR** — `feat: pp rework migrations and runbook`; open PR "airosu online M2: scores + pp pipeline" based on `v2.0-online-auth`.

---

# Milestone 3 — Leaderboards (branch `v2.2-leaderboard`, from `v2.1-scores`)

### Task 10: Leaderboard aggregates

**Files:**
- Create: `convex/leaderboard.ts`
- Modify: `convex/convex.config.ts` (two aggregate components), `convex/scores.ts` (`recomputeUserTotals` maintains aggregates), `convex/schema.ts` (add `countries` table)

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

- [ ] **Step 2: Add `countries` table to schema** (drives the filter dropdown without scanning users):

```ts
countries: defineTable({ code: v.string(), name: v.string() }).index('by_code', ['code']),
```

- [ ] **Step 3: `convex/leaderboard.ts`**:

```ts
import { TableAggregate } from '@convex-dev/aggregate';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { query, type MutationCtx } from './_generated/server';
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
  namespace: (u) => u.countryCode ?? '??',
  sortKey: (u) => -(u.totalPp ?? 0),
});

/** Call whenever a user's totalPp (or country) may have changed. */
export async function syncBoards(ctx: MutationCtx, before: Doc<'users'> | null, after: Doc<'users'>) {
  if (before) {
    await globalBoard.replace(ctx, before, after);
    await countryBoard.replace(ctx, before, after);
  } else {
    await globalBoard.insertIfDoesNotExist(ctx, after);
    await countryBoard.insertIfDoesNotExist(ctx, after);
  }
  if (after.countryCode && after.countryName) {
    const seen = await ctx.db
      .query('countries').withIndex('by_code', (q) => q.eq('code', after.countryCode!)).unique();
    if (!seen) await ctx.db.insert('countries', { code: after.countryCode, name: after.countryName });
  }
}

export async function userRanks(ctx: { db: MutationCtx['db'] } & any, user: Doc<'users'>) {
  if (!user.totalPp) return { globalRank: null, countryRank: null };
  const globalRank = 1 + (await globalBoard.indexOf(ctx, -(user.totalPp ?? 0), { id: user._id }));
  const countryRank = user.countryCode
    ? 1 + (await countryBoard.indexOf(ctx, -(user.totalPp ?? 0), { id: user._id, namespace: user.countryCode }))
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
    const rows = [];
    for (let i = offset; i < Math.min(offset + PAGE, total); i++) {
      const item = await board.at(ctx, i, ns as never);
      const u = await ctx.db.get(item.id);
      if (!u || !u.totalPp) continue; // rank 0 users trail the board — stop early
      rows.push({
        rank: i + 1, osuId: u.osuId, name: u.name, image: u.image,
        countryCode: u.countryCode, totalPp: u.totalPp,
        hitAccuracy: u.hitAccuracy ?? 0, playCount: u.playCount ?? 0,
      });
    }
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
  - `api.profile.byOsuId` query `{ osuId: number } → null | { user: {...public fields incl. osuPp/osuGlobalRank/osuStatsSyncedAt}, globalRank, countryRank, topPlays: PlayRow[], recentPlays: PlayRow[] }` where `PlayRow = { scoreId, pp, weight (topPlays only), accuracy, grade, maxCombo, inputMode, forgiveness, playedAt, map: { title, artist, version, starRating, coverUrl?, rankedStatus?, osuBeatmapId?, osuBeatmapSetId? } }`
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

- [ ] **Step 3: `PlayRow.tsx`** — one row per play: left cover thumbnail (`map.coverUrl` if set, else the panel background), map `title [version]` (linked to `https://osu.ppy.sh/beatmaps/{osuBeatmapId}` when present) + `artist`, star badge (reuse `src/ui/home/starColor.ts`), ranked-status badge when `rankedStatus === 'ranked' || 'loved' || 'approved'`, grade letter colored by `gradeColor`, accuracy, `{maxCombo}x`, settings badge when non-default (`inputMode !== 'relax' || forgiveness !== 1.5` → e.g. `manual · 1.0×`), right-aligned `pp` and (topPlays only) `weighted {Math.round(pp * weight)}pp ({Math.round(weight * 100)}%)`.

- [ ] **Step 4: Route + verify** — replace the `/u/:osuId` placeholder. Manual: own profile from navbar shows header stats matching dashboard, top plays sorted by pp with weights 100%, 95%, …; osu! comparison appears after sync; unknown osuId shows not-found. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit + PR** — `feat: osu-style profile page`; PR "airosu online M4: profiles" based on `v2.2-leaderboard`.

---

# Milestone 5 — Local map library (branch `v2.4-map-library`, from `v2.3-profile`)

### Task 14: IndexedDB library module — TDD

**Files:**
- Create: `src/beatmap/library.ts`, `src/beatmap/library.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LibraryEntry { id: string; label: string; addedAt: number }
export function saveMapset(bytes: Uint8Array, label: string): Promise<LibraryEntry>  // id = sha-256 hex of bytes; overwrites duplicates
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
    const entry = await saveMapset(bytes('osz-bytes'), 'Artist — Title');
    expect(entry.id).toMatch(/^[0-9a-f]{64}$/);
    const listed = await listMapsets();
    expect(listed).toHaveLength(1);
    expect(listed[0].label).toBe('Artist — Title');
    expect(await getMapsetBytes(entry.id)).toEqual(bytes('osz-bytes'));
  });

  it('dedupes identical bytes', async () => {
    await saveMapset(bytes('same'), 'first');
    await saveMapset(bytes('same'), 'second');
    expect(await listMapsets()).toHaveLength(1);
  });

  it('lists newest first and deletes', async () => {
    const a = await saveMapset(bytes('a'), 'A');
    await new Promise((r) => setTimeout(r, 5));
    await saveMapset(bytes('b'), 'B');
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

export async function saveMapset(bytes: Uint8Array, label: string): Promise<LibraryEntry> {
  const id = await sha256Hex(bytes);
  const entry: LibraryEntry = { id, label, addedAt: Date.now() };
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
- Produces: `useLibrary(): { entries: LibraryEntry[]; save(bytes, label): Promise<void>; remove(id): Promise<void>; open(id): Promise<Uint8Array | undefined>; unavailable: boolean }` — every method try/catches; failures set `unavailable` and leave the session working in-memory (today's behavior).

- [ ] **Step 1: `useLibrary.ts`** — state `entries: LibraryEntry[]`, `unavailable: boolean`; `useEffect` on mount calls `listMapsets()` (catch → `unavailable = true`); `save` calls `saveMapset` then refreshes entries (catch → `unavailable = true`, don't rethrow — upload continues in-memory); `remove` deletes + refreshes; `open` returns `getMapsetBytes(id)`.

- [ ] **Step 2: Wire uploads** — in `MapLoadScreen.handleFile`, after a successful `openMapset(bytes, label)` for a `.osz`, call `void library.save(bytes, label)` (fire-and-forget; `.osu` single files skip the library). 

- [ ] **Step 3: `YourMaps.tsx`** — renders nothing when `entries.length === 0`; otherwise an eyebrow heading "your maps" + rows (label, added date, ✕ delete button with `confirm()`), click row → `open(id)` → `openMapset(bytes, entry.label)`; when `unavailable`, a muted one-liner "browser storage unavailable — uploads won't persist". Mount below the drop-zone label in MapLoadScreen (only in the `!mapset` branch). Keep <100 lines.

- [ ] **Step 4: Manual verification** — upload an `.osz`, reload the page → it's under "your maps"; click → difficulty picker opens; delete removes it after reload too; private-browsing (or DevTools → Application → block storage) still lets you upload and play. `pnpm test && pnpm lint && pnpm build`.

- [ ] **Step 5: Commit + PR** — `feat: persistent local map library`; PR "airosu online M5: your maps library" based on `v2.3-profile`.

---

## Final integration checklist (after M5 merges)

- [ ] Full manual pass on dev: sign in → play bundled map → submit → leaderboard rank → profile top plays → upload custom map → play + submit (enriches as `graveyard`/`unknown` if unsubmitted) → reload, library persists.
- [ ] Production bring-up (repo owner, Human prerequisite 4): prod deployment, env vars, osu! callback URL, Vercel `VITE_CONVEX_URL`; verify sign-in on airosu.ycells.com.
- [ ] Update `docs/superpowers/specs` links in README if any; update memory/progress notes.

## Deviations from spec (intentional)

- `LoadedBeatmap.meta` does **not** gain `md5`/`beatmapId`/`objectCount`: the server derives all of them from the submitted `.osu` text in `registerMap`, so the client never needs them (YAGNI).
- Client-side md5 (spark-md5) dropped for the same reason; the local library keys by WebCrypto SHA-256 instead.
- `countries` table added (not in spec's table list) to power the filter dropdown without scanning users.
