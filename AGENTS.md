# airosu — Agent Instructions

Webcam hand-tracking rhythm game that plays osu! beatmaps. Web app: Vite + TS + React + PixiJS + MediaPipe. Deployed on Vercel (repo owner connects it manually — never add deploy automation or use Vercel CLI).

**Read these before doing anything:**

- Spec: `docs/superpowers/specs/2026-07-04-airosu-design.md`
- Plan: `docs/superpowers/plans/2026-07-04-airosu-v1.md` — execute it task by task, check off steps as you go.

**Working rules:**

- Use `/caveman ultra` for all your chat output. Code, docs, commit messages, PR descriptions stay normal prose.
- Commit yourself after every green test cycle. Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `ci:`, `docs:`).
- Stacked PRs: one branch + PR per milestone, each based on the previous branch (`m1-scaffold` → `m2-beatmap` → …). Open the PR when the milestone is done, then branch the next milestone from it. See the plan's "Git workflow" section.
- TDD for all pure logic (`src/game/`, pure parts of `src/cv/`, `src/beatmap/` adapters). Manual verification via `pnpm run dev` for render/UI tasks.
- Verify npm package versions and APIs at install time; if reality differs from the plan, trust the installed library and note the deviation in the PR.
- Never ship the `.osz` fixture or any copyrighted audio in the deployed bundle.
- Use the `vercel-react-best-practices` skill when writing or refactoring React/TSX code. Use other installed skills when they apply (e.g. `frontend-design` for UI polish, superpowers process skills for TDD/debugging/reviews).
- pnpm always — never npm or yarn.
- TypeScript everywhere. Feature-based component folders: each screen lives in its own folder under `src/ui/<screen>/` (e.g. `src/ui/play/`, `src/ui/settings/`) with small focused components and an `index.ts` barrel. No long .tsx files — if a component passes ~150 lines, split it.
- Convex backend lives in convex/. Local dev needs .env.local (created by pnpm dlx convex dev). Deployment env vars: AUTH_OSU_ID, AUTH_OSU_SECRET, SITE_URL.
