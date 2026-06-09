# Beauty Appointment Scheduler

A mobile-first web app (PWA) for managing recurring beauty appointments: save the
businesses you visit, set how often you go, get reminded before you're due, deep-link
to booking, log spend, and add confirmed appointments to your calendar via `.ics`.

Built with **Next.js 16**, **Supabase** (Postgres + Auth), **Tailwind v4**, and **Resend**.

## Docs

- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — what we're building and why
- [`docs/DESIGN.md`](docs/DESIGN.md) — architecture, data model, integrations
- [`docs/TASKS.md`](docs/TASKS.md) — phased, testable build plan

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the template, then fill in real values:

```bash
cp .env.example .env.local
```

Set your Supabase keys (Project Settings → API at <https://supabase.com/dashboard>):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable key, `sb_publishable_…` (safe in the browser)
- `SUPABASE_SECRET_KEY` — the secret key, `sb_secret_…`, server-only (**never** exposed to the browser)

### 3. Run

```bash
npm run dev      # http://localhost:3000
```

### Verify Supabase is wired up

```bash
curl http://localhost:3000/api/health
# { "ok": true,  "supabase": "connected" }      ← keys are working
# { "ok": false, "supabase": "not_configured" } ← still using placeholders
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## Project layout

```
src/
  app/                 # routes (App Router) + /api/health
  lib/supabase/        # browser / server / admin clients
  proxy.ts             # Next 16 session refresh (formerly "middleware")
docs/                  # requirements, design, tasks
```

## Status

**Phase 0 (foundations) complete.** Next up: Phase 1 (accounts & auth). See [`docs/TASKS.md`](docs/TASKS.md).
