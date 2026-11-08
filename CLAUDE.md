@AGENTS.md

# Campaign Codex

Local-only Next.js app for prepping and running a single D&D campaign. **Read `plan.md` first**:
it holds the roadmap, data model, interaction flows, and the slice you are working on.

## Workflow
- One slice per branch/PR (`slice/<n>-<name>`), budget ~400 changed lines excluding lockfiles,
  generated migrations and seed data. Over budget → stop and propose a split in `plan.md`.
- Out-of-scope ideas go in the **Parking lot** in `plan.md`, not in the diff.
- Before opening a PR: `npm run check` must pass; run `npm run test:e2e` when UI changed.

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:3000) |
| Typecheck / lint / unit tests | `npm run check` (or each: `typecheck`, `lint`, `test`) |
| E2E tests | `npm run test:e2e` (uses `data/e2e.db`, port 3100) |
| Generate migration after schema change | `npm run db:generate` |
| Apply migrations (also rebuilds derived links) | `npm run db:migrate` |
| Seed sample data | `npm run db:seed` |

## Conventions
- **Database**: SQLite file at `data/codex.db` (gitignored; override with `CODEX_DB_PATH`).
  Access it through `getDb()` from `src/db/client.ts`; tests use `createDb(":memory:")` plus
  `runMigrations`. Never delete or overwrite `data/codex.db`: it is the user's campaign.
- **Schema**: one file per table in `src/db/schema/`, re-exported from `src/db/schema/index.ts`.
  Data-access functions live in `src/db/<table>.ts`, never inline in components.
- **Postgres-readiness**: no raw SQL outside `src/db/search.ts`; validate
  JSON columns with zod on write; cuid2 string IDs; integer timestamps via Drizzle's `timestamp` mode.
- **Next.js 16 with `cacheComponents`**: better-sqlite3 is synchronous, so a query in a Server
  Component is treated as static and prerendered. Call `await connection()` (from `next/server`)
  before reading data that changes. Mutations go through Server Actions.
- **E2E locators**: Next 16 keeps recently visited routes mounted but hidden, so use `getByRole`
  (skips hidden elements), not `getByLabel`/`getByText`, for anything that might repeat across pages.
  Tests run on one worker against a shared seeded DB: assert membership, not exact lists.
- **UI**: shadcn/ui components (`npx shadcn@latest add <name>`) and Tailwind; no other UI kits.
