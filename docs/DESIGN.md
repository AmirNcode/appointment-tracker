# DESIGN.md — Beauty Appointment Scheduler (v1)

> Companion to [REQUIREMENTS.md](./REQUIREMENTS.md). This document translates the v1
> requirements into a concrete technical design: architecture, data model, project
> structure, the external integrations (Google Places and email, plus local `.ics` calendar
> export), the auth model, and the key decisions and tradeoffs behind them.
>
> **Audience:** a solo, lightly-technical founder building with Claude Code.
> The guiding principle throughout is **low-ops, boring, and legal** — favour managed
> services and the simplest design that satisfies the [Definition of Done](./REQUIREMENTS.md#12-definition-of-done-v1).

---

## Table of contents

1. [Design goals & constraints](#1-design-goals--constraints)
2. [System architecture](#2-system-architecture)
3. [Key request flows](#3-key-request-flows)
4. [Data model](#4-data-model)
5. [File / folder structure](#5-file--folder-structure)
6. [Auth approach](#6-auth-approach)
7. [Integration: Google Places](#7-integration-google-places)
8. [Integration: Calendar export (.ics)](#8-integration-calendar-export-ics)
9. [Integration: Email (Resend)](#9-integration-email-resend)
10. [Reminder scheduling engine](#10-reminder-scheduling-engine)
11. [Security, privacy & compliance](#11-security-privacy--compliance)
12. [Environment & configuration](#12-environment--configuration)
13. [Key decisions & tradeoffs](#13-key-decisions--tradeoffs)
14. [Assumptions & open questions](#14-assumptions--open-questions)
15. [Suggested build order](#15-suggested-build-order)

---

## 1. Design goals & constraints

| Goal | Implication for design |
|------|------------------------|
| Ship fast, solo, low-ops | Managed services only (Supabase, Vercel, Resend, Google Places). No self-hosted servers, queues, or cron daemons. |
| Stay on free tiers at launch | Daily cron (Vercel Hobby limit), minimal API field requests, cache where ToS allows. |
| Mobile-first, installable | Next.js + PWA manifest; responsive UI; no native app. |
| Legal & privacy-safe (Canada) | CASL-compliant email opt-in/unsubscribe; data minimization; account+data deletion; comply with Google Places terms. |
| "Memory + nudge", **not** auto-booking | No scraping, bots, or stored salon credentials. The app only links out and records what the user tells it. |
| Minimize external review/approval risk | Calendar add via a local `.ics` file rather than the Google Calendar API — no Google sensitive-scope verification gating launch ([§8](#8-integration-calendar-export-ics)). |
| Extensible without rework | Reminder channel is an enum (email now, push/SMS later); booking method is an enum; scheduling logic isolated in one module. |

**Non-goals (v1):** auto-booking, SMS/push, live OAuth calendar sync, availability matching, bank-linked
spend, native apps, French localization. See [REQUIREMENTS §6](./REQUIREMENTS.md#6-out-of-scope-for-v1-deferred).

---

## 2. System architecture

A single **Next.js (App Router)** application deployed to **Vercel**, backed by **Supabase**
(Postgres + Auth), talking to two external services (Google Places, Resend) and generating calendar
files locally. There is no separate backend service — Next.js Server Components, Server Actions, and a
handful of Route Handlers *are* the backend.

```
                         ┌──────────────────────────────────────────────┐
                         │                  Vercel                        │
                         │                                                │
   ┌──────────┐  HTTPS   │   Next.js (App Router)                         │
   │  Browser │◄────────►│   ├─ Server Components (data fetch via RLS)    │
   │  (PWA,   │          │   ├─ Server Actions (mutations, trusted)       │
   │  mobile) │          │   ├─ Route Handlers:                           │
   │          │          │   │    /api/places/*        (search proxy)     │
   │  anon    │          │   │    /api/cron/send-reminders (daily)        │
   │  key +   │          │   │    /auth/callback       (Supabase PKCE)    │
   │  RLS for │          │   ├─ .ics generation (in-app download)         │
   │  reads   │          │   └─ middleware.ts (session refresh + guard)   │
   └──────────┘          │                                                │
                         │   Vercel Cron ──(daily, Bearer CRON_SECRET)───►│ /api/cron/send-reminders
                         └───────┬───────────────────────────┬────────────┘
                                 │                           │
                  service-role / │                 API key + │
                  anon + RLS     │                 field mask│
                                 ▼                           ▼
                        ┌────────────────┐         ┌──────────────┐
                        │   Supabase     │         │ Google Places│
                        │  Postgres+Auth │         │   (New) API  │
                        │     (RLS)      │         └──────────────┘
                        └────────────────┘
                                 ▲
                                 │ API (email + .ics attachment)
                        ┌────────────────┐
                        │     Resend      │  ◄── transactional email (+ .ics)
                        └────────────────┘
```

### Component responsibilities

- **Browser (client):** renders UI, reads its own rows directly from Supabase using the
  **anon key under Row-Level Security (RLS)**. Mutations go through Server Actions, not direct
  client writes, so business rules (scheduling, calendar-file generation) run server-side.
- **Next.js server (Vercel):** all trusted logic. Holds the Supabase **service-role key**,
  the Google **Places** API key, the Resend key, and `CRON_SECRET` — none of which ever reach the
  browser.
- **Supabase Postgres + Auth:** source of truth for users, spots, services, appointments, and
  reminders. RLS enforces per-user isolation.
- **Google Places (New):** business search/autocomplete + details, proxied server-side.
- **`.ics` calendar export:** generated server-side on appointment confirmation and delivered as an
  in-app download and an email attachment — **no external calendar service, OAuth, or stored
  credentials** ([§8](#8-integration-calendar-export-ics)).
- **Resend:** transactional reminder, booking-confirmation (with `.ics`), and lifecycle emails.
- **Vercel Cron:** fires the daily reminder sweep.

### Why this shape

A single deployable app with managed dependencies is the lowest-ops architecture that still
cleanly separates **trusted server logic** from the **client**. RLS gives a strong default
security posture (every query is scoped to `auth.uid()` even if app code has a bug), and the
"reads via RLS, writes via Server Actions" split keeps the client thin without forcing us to
hand-write a REST/GraphQL layer for every entity. Generating calendar files locally (instead of
calling a Calendar API) removes an entire OAuth/token/verification surface from the system.

---

## 3. Key request flows

### 3.1 Add a spot (search → save)
```
User types name
  → client calls /api/places/autocomplete?q=...&session=<token>   (server proxies, key hidden)
  → user picks a result
  → client calls /api/places/details?placeId=...&session=<token>  (one billable session)
  → server returns minimized fields (name, address, phone, hours, website)
  → user tags services + chooses booking method
  → Server Action `createSpot()` inserts spot (+ services) with user_id = auth.uid()
```

### 3.2 Confirm a booked appointment → calendar file
```
User taps "Book now" → deep-links to phone/website (no server call)
  → user books externally, returns, enters confirmed date/time (+ optional cost)
  → Server Action `confirmAppointment()`:
       1. update appointment: status='booked', confirmed_datetime, cost
       2. generate the .ics (UID = appointment id) and:
            • expose it via an in-app "Add to calendar" download, and
            • send a booking-confirmation email with the .ics attached
       3. create a "pre-appointment" reminder row (send_at = confirmed_datetime − 7d)
```

### 3.3 Complete an appointment → roll forward the cycle
```
Appointment date passes; user marks it 'completed' (+ confirms cost)
  → Server Action `completeAppointment()`:
       1. update appointment: status='completed'
       2. compute next due_date = completed date + service.frequency
       3. insert next appointment (status='due', due_date)
       4. insert "due-soon" reminder (send_at = due_date − 7d)
```

### 3.4 Daily reminder sweep
```
Vercel Cron (daily) → GET /api/cron/send-reminders  (Authorization: Bearer CRON_SECRET)
  → service-role query: reminders WHERE sent=false AND send_at <= now()
       AND user still opted in
  → for each: render template, send via Resend, set sent=true, sent_at=now()
  → failures stay sent=false and retry next day (idempotent)
```

---

## 4. Data model

Postgres on Supabase. Conventions: `uuid` primary keys (`gen_random_uuid()`), `timestamptz`
for all timestamps, `created_at`/`updated_at` on every table, **`user_id` denormalized onto
every user-owned table** so RLS policies and indexes stay simple and fast. All app-facing
tables live in `public` and have RLS enabled.

### 4.1 Entity-relationship overview
```
auth.users (Supabase-managed)
   │ 1:1
   ▼
profiles ──1:N── spots ──1:N── services
                   │              │
                   │              └──1:N── appointments ──1:N── reminders
                   └────────── (appointments also reference spot_id)
```

### 4.2 Enumerated types
```sql
create type booking_method     as enum ('phone', 'website', 'other');
create type frequency_unit     as enum ('day', 'week', 'month');
create type appointment_status as enum ('due', 'booked', 'completed', 'cancelled');
create type reminder_channel   as enum ('email', 'sms', 'push');      -- only 'email' active in v1
create type reminder_type      as enum ('due_soon', 'pre_appointment');
```

### 4.3 `profiles`
One row per user, keyed to `auth.users.id`. Holds preferences not owned by Supabase Auth.

| column | type | notes |
|--------|------|-------|
| `id` | `uuid` PK | = `auth.users.id` (FK, `on delete cascade`) |
| `email` | `text` | mirrored from auth for convenience |
| `full_name` | `text` | optional |
| `timezone` | `text` | IANA tz, e.g. `America/Toronto`; defaults from client at sign-up |
| `email_reminders_opt_in` | `boolean` default `false` | **CASL** — must be explicit opt-in |
| `marketing_opt_in` | `boolean` default `false` | separate consent, not used for reminders |
| `created_at` / `updated_at` | `timestamptz` | |

> Created automatically on sign-up via a `handle_new_user()` trigger on `auth.users`.

### 4.4 `spots`
A saved business. Mirrors the data captured from Google Places ([§7](#7-integration-google-places)).

| column | type | notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK→profiles | `on delete cascade` |
| `google_place_id` | `text` | stable Google identifier; cache-key for re-fetch |
| `name` | `text` not null | |
| `formatted_address` | `text` | |
| `latitude` / `longitude` | `double precision` | optional, for calendar location & maps link |
| `phone` | `text` | E.164 if available |
| `website_url` | `text` | from Places |
| `booking_url` | `text` | user-confirmed booking link (may differ from website) |
| `booking_method` | `booking_method` not null default `'other'` | drives "Book now" |
| `opening_hours` | `jsonb` | Places `regularOpeningHours` (periods + display strings) |
| `google_maps_uri` | `text` | deep link fallback |
| `created_at` / `updated_at` | `timestamptz` | |

Constraints/indexes: `unique (user_id, google_place_id)` (no duplicate saves);
index on `user_id`.

### 4.5 `services`
A service the user gets at a spot, with its cadence. The dashboard's "next due" is driven from here.

| column | type | notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK→profiles | denormalized for RLS |
| `spot_id` | `uuid` FK→spots | `on delete cascade` |
| `name` | `text` not null | e.g. "Pedicure", "Waxing", "Laser" |
| `frequency_value` | `integer` not null | e.g. `5` |
| `frequency_unit` | `frequency_unit` not null | e.g. `'week'` → "every 5 weeks" |
| `anchor_date` | `date` | date of the user's *last* visit before using the app; seeds the first due date when no appointment exists yet (optional) |
| `is_active` | `boolean` default `true` | pause without deleting |
| `created_at` / `updated_at` | `timestamptz` | |

> **Why value + unit (not a raw `interval` or day-count):** the UI speaks in
> "every 5 weeks / every 2 months", and month-length math must respect calendar months
> (a "monthly" service in Feb vs. Aug). Storing the user's intent verbatim keeps the UI honest;
> the scheduling module converts to a concrete next date with calendar-aware arithmetic.

### 4.6 `appointments`
A **materialized** row per cycle, moving through a small state machine. This is the spine of the
dashboard, calendar export, reminders, and spend history.

| column | type | notes |
|--------|------|-------|
| `id` | `uuid` PK | also the `.ics` `UID` (`{id}@<app domain>`) — stable across re-issues |
| `user_id` | `uuid` FK→profiles | denormalized for RLS |
| `spot_id` | `uuid` FK→spots | |
| `service_id` | `uuid` FK→services | |
| `status` | `appointment_status` not null default `'due'` | `due → booked → completed` (or `cancelled`) |
| `due_date` | `date` not null | when the next visit *should* happen (drives "due-soon" reminder) |
| `confirmed_datetime` | `timestamptz` | set when user confirms a real booking |
| `duration_minutes` | `integer` default `60` | for the calendar event end time |
| `cost` | `numeric(10,2)` | manually entered ([§4.8 spend](./REQUIREMENTS.md#48-spend-tracking)) |
| `currency` | `text` default `'CAD'` | |
| `ics_sequence` | `integer` default `0` | iCalendar `SEQUENCE`; bumped when a confirmed appointment is edited so re-issued `.ics` files update the same event ([§8.4](#84-edits--cancellations-best-effort)) |
| `notes` | `text` | optional |
| `created_at` / `updated_at` | `timestamptz` | |

State machine:
```
        complete (sets next cycle)
   ┌───────────────────────────────────┐
   │                                    ▼
 [due] ──confirm──► [booked] ──happens──► [completed]
   │                   │
   └──── cancel ───────┴────► [cancelled]
```
Indexes: `(user_id, status, due_date)` (dashboard + sweep), `(spot_id)`, `(service_id)`.
Spend reporting aggregates `cost` grouped by `spot_id` / `service_id` / month.

> **Invariant:** at most one *open* (`due` or `booked`) appointment per service at a time.
> Enforced with a partial unique index:
> `unique (service_id) where status in ('due','booked')`.

### 4.7 `reminders`
One row per scheduled nudge. Channel-agnostic by design so push/SMS slot in later with no schema change.

| column | type | notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK→profiles | denormalized for RLS + opt-in checks |
| `appointment_id` | `uuid` FK→appointments | `on delete cascade` |
| `type` | `reminder_type` | `due_soon` (unbooked) or `pre_appointment` (confirmed) |
| `channel` | `reminder_channel` not null default `'email'` | only email sent in v1 |
| `send_at` | `timestamptz` not null | computed in the user's timezone |
| `sent` | `boolean` not null default `false` | |
| `sent_at` | `timestamptz` | |
| `last_error` | `text` | for retry visibility |
| `created_at` | `timestamptz` | |

Indexes: **partial** `(send_at) where sent = false` — keeps the daily sweep query tiny;
`(appointment_id)`.

> **No `calendar_connections` table.** Because calendar add is a local `.ics` export ([§8](#8-integration-calendar-export-ics)),
> there are no OAuth tokens to store, encrypt, or refresh, and no per-user connection state to track.

### 4.8 Row-Level Security (all tables)
RLS is the primary authorization mechanism. Every user-owned table gets:
```sql
alter table <t> enable row level security;

create policy "owner can read"   on <t> for select using (user_id = auth.uid());
create policy "owner can insert" on <t> for insert with check (user_id = auth.uid());
create policy "owner can update" on <t> for update using (user_id = auth.uid())
                                                with check (user_id = auth.uid());
create policy "owner can delete" on <t> for delete using (user_id = auth.uid());
```
The **service-role** key (used only in `/api/cron/*`) bypasses RLS by design; that path never
accepts a `user_id` from the client — it derives it from the row being processed.

---

## 5. File / folder structure

Next.js App Router, `src/` directory, TypeScript. Migrations live with the repo so the schema is
reproducible.

```
beauty-scheduler/
├─ docs/
│  ├─ REQUIREMENTS.md
│  └─ DESIGN.md
├─ public/
│  ├─ manifest.webmanifest          # PWA: installable, mobile-first
│  └─ icons/                        # app icons (maskable)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # root layout, providers, PWA meta
│  │  ├─ (marketing)/               # unauthenticated
│  │  │  ├─ page.tsx                # landing
│  │  │  └─ login/page.tsx          # email/password + "Continue with Google"
│  │  ├─ (app)/                     # authenticated shell (layout guards session)
│  │  │  ├─ layout.tsx
│  │  │  ├─ dashboard/page.tsx      # upcoming/overdue, sorted by due_date
│  │  │  ├─ spots/
│  │  │  │  ├─ page.tsx             # list
│  │  │  │  ├─ new/page.tsx         # search + add (Places)
│  │  │  │  └─ [spotId]/page.tsx    # detail, services, booking method
│  │  │  ├─ appointments/
│  │  │  │  └─ [id]/page.tsx        # confirm / complete / enter cost / add-to-calendar
│  │  │  ├─ spend/page.tsx          # totals, per-spot, per-service, monthly
│  │  │  └─ settings/page.tsx       # reminder opt-in, delete account
│  │  ├─ auth/
│  │  │  └─ callback/route.ts       # Supabase OAuth/PKCE code exchange (sign-in)
│  │  └─ api/
│  │     ├─ places/
│  │     │  ├─ autocomplete/route.ts
│  │     │  └─ details/route.ts
│  │     ├─ appointments/
│  │     │  └─ [id]/ics/route.ts    # returns text/calendar for in-app download
│  │     └─ cron/
│  │        └─ send-reminders/route.ts
│  ├─ actions/                      # Server Actions (trusted mutations)
│  │  ├─ spots.ts                   # createSpot, updateBookingMethod, deleteSpot
│  │  ├─ services.ts                # add/edit/pause service
│  │  └─ appointments.ts            # confirmAppointment, completeAppointment, cancel
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ client.ts               # browser client (anon key)
│  │  │  ├─ server.ts               # server client (cookies, anon key + user session)
│  │  │  └─ admin.ts                # service-role client (server-only, never imported client-side)
│  │  ├─ google/
│  │  │  └─ places.ts               # autocomplete/details, field masks, session tokens
│  │  ├─ calendar/
│  │  │  └─ ics.ts                  # build the .ics (VEVENT) for an appointment
│  │  ├─ email/
│  │  │  ├─ resend.ts               # client + send wrapper (adds unsubscribe header)
│  │  │  └─ templates/              # React Email templates
│  │  │     ├─ booking-confirmation.tsx   # carries the .ics attachment
│  │  │     ├─ due-soon.tsx
│  │  │     └─ pre-appointment.tsx
│  │  └─ domain/                    # pure business logic (unit-tested, no I/O)
│  │     ├─ scheduling.ts           # nextDueDate(anchor|lastDate, value, unit)
│  │     └─ reminders.ts            # buildReminderForAppointment(...)
│  ├─ middleware.ts                 # refresh Supabase session cookie + protect (app) routes
│  └─ types/                        # generated Supabase types + shared types
├─ supabase/
│  ├─ migrations/                   # 0001_init.sql, 0002_rls.sql, 0003_indexes.sql, ...
│  └─ config.toml
├─ vercel.json                      # cron schedule
├─ next.config.js
├─ .env.local                       # secrets (gitignored)
├─ .env.example                     # documented placeholders (committed)
├─ package.json
└─ tsconfig.json
```

The `lib/domain/` modules contain **no I/O** — just date math and reminder construction — so the
trickiest logic (cadence, due dates, month-end edge cases) is unit-testable without a database or
network. Likewise `lib/calendar/ics.ts` is pure string generation, so the `.ics` output is easy to
snapshot-test. This is the highest-leverage place to be rigorous for a non-technical builder.

---

## 6. Auth approach

### 6.1 Identity (sign-in)
**Supabase Auth** with the `@supabase/ssr` package for the App Router (cookie-based sessions).
Two methods, per [REQUIREMENTS §4.1](./REQUIREMENTS.md#41-accounts):

- **Email + password** — Supabase built-in (with email confirmation).
- **Google sign-in** — Supabase OAuth (PKCE). The Google OAuth client ID/secret are configured in the
  **Supabase dashboard** (not in app env), using only basic profile/email scopes — **no Google
  sensitive-scope review**. The `/auth/callback` route exchanges the code for a session;
  `middleware.ts` refreshes the session cookie on each request and redirects unauthenticated users
  away from `(app)/*`.

On first sign-in, a Postgres trigger creates the matching `profiles` row.

### 6.2 Authorization
**RLS everywhere** (see [§4.8](#48-row-level-security-all-tables)). The browser uses the anon key and
can only ever see/write its own rows. The one trusted server path (the cron sweep) uses the
service-role key and never trusts a client-supplied `user_id`.

### 6.3 Calendar export needs no auth
Confirmed appointments are exported as an `.ics` file ([§8](#8-integration-calendar-export-ics)), which
the user adds to whatever calendar they like. There is **no** Google Calendar OAuth, **no** stored
calendar tokens, **no** `connect/disconnect` flow, and **no** Google sensitive-scope verification.
This is a deliberate simplification over the originally-specified OAuth Google Calendar sync —
rationale in [§8.1](#81-why-ics-instead-of-the-google-calendar-api) and [§13](#13-key-decisions--tradeoffs).
The only Google credential the app holds server-side is the **Places** API key.

---

## 7. Integration: Google Places

**Purpose:** let the user find and save a business by name, "like in Google Maps"
([REQUIREMENTS §4.2](./REQUIREMENTS.md#42-add-a-spot-saved-business)).

### 7.1 API & pattern
Use the **Places API (New)**:
- **Autocomplete (New)** — `POST https://places.googleapis.com/v1/places:autocomplete` for
  type-ahead suggestions as the user types.
- **Place Details (New)** — `GET https://places.googleapis.com/v1/places/{placeId}` once the user
  selects a result, to fetch the fields we store.

### 7.2 Server-side proxy (never call from the browser)
Both calls go through our own routes (`/api/places/autocomplete`, `/api/places/details`) so:
- the **API key stays server-side** (passed as `X-Goog-Api-Key`; never shipped to the client),
- we apply a **field mask** (`X-Goog-FieldMask`) to fetch *only* what we store — controlling cost
  **and** practicing data minimization,
- we attach the user's session and rate-limit per user.

**Fields requested** (mask): `id`, `displayName`, `formattedAddress`, `location`,
`internationalPhoneNumber`, `regularOpeningHours`, `websiteUri`, `googleMapsUri`. These map directly
to `spots` columns ([§4.4](#44-spots)).

### 7.3 Cost control
- **Session tokens:** generate one token per "search session" and pass it to autocomplete *and* the
  follow-up details call so Google bills them as a single session rather than per-keystroke.
- **No speculative details calls** — details only fire on explicit selection.
- **Debounce** autocomplete input (~300 ms) client-side.
- Stay within the free monthly tier at launch volume; alert if usage approaches it.

### 7.4 Compliance & caching
- We store `google_place_id` (allowed to retain) and the displayed fields needed for the app's
  function. We **re-fetch** opening hours periodically rather than treating cached hours as permanent,
  per Google's caching terms.
- Show the data in the user's own private list only; no redistribution.

---

## 8. Integration: Calendar export (.ics)

**Purpose:** add a confirmed appointment to the user's calendar
([REQUIREMENTS §4.6](./REQUIREMENTS.md#46-calendar-integration-ics-export)) — **without** any OAuth,
stored tokens, or Google review.

### 8.1 Why .ics instead of the Google Calendar API
- **No Google verification gate.** The Calendar API scope is "sensitive", so OAuth would require
  Google's app-verification review (can take weeks) before production. `.ics` needs none of it.
- **Works with every calendar** — Google, Apple, Outlook — not just Google.
- **No tokens to store, encrypt, or refresh**, and no `connect/disconnect` flow. This removes an
  entire table, an OAuth flow, secret-encryption (Vault), and a set of env vars from the system.
- Tradeoff: it's a **one-way export, not a live sync** — see [§8.4](#84-edits--cancellations-best-effort)
  and [§13](#13-key-decisions--tradeoffs). True OAuth auto-sync is deferred
  ([REQUIREMENTS §6](./REQUIREMENTS.md#6-out-of-scope-for-v1-deferred)).

### 8.2 Generating the file
`lib/calendar/ics.ts` produces an RFC 5545 `VEVENT` from an appointment. **No external service is
called** — it's pure string generation (use the `ics` npm package or ~30 hand-rolled lines):

| iCalendar field | Source |
|-----------------|--------|
| `UID` | `{appointment.id}@<app domain>` — stable, so re-issues update the same event |
| `SEQUENCE` | `appointments.ics_sequence` — bumped on each edit |
| `DTSTART` / `DTEND` | `confirmed_datetime` … `+ duration_minutes`, with the user's `timezone` (`VTIMEZONE` block, or UTC) |
| `SUMMARY` | `"{service} @ {business name}"` |
| `LOCATION` | spot `formatted_address` |
| `DESCRIPTION` | phone / booking link + "scheduled via …" note |
| `VALARM` | optional in-event reminder (e.g. popup 1 day before) — complements the email reminder |
| `STATUS` / `METHOD` | `CONFIRMED` / `REQUEST` (new + edits); `CANCEL` for cancellations |

### 8.3 Delivery (two channels, both simple)
1. **In-app "Add to calendar" button** — `GET /api/appointments/[id]/ics` returns the file with
   `Content-Type: text/calendar` so the browser/OS hands it to the calendar app.
2. **Attached to the booking-confirmation email** ([§9.3](#93-email-types-v1)) — Gmail and Apple Mail
   auto-detect `.ics` attachments and render an inline "Add to calendar" action. This covers mobile
   cleanly, where downloading a file in the browser can be clunky.

### 8.4 Edits & cancellations (best-effort)
To change or cancel, re-issue the `.ics` with the **same `UID`**, a **higher `SEQUENCE`** (bump
`ics_sequence`), and `METHOD:REQUEST` (update) or `METHOD:CANCEL` (cancel). Most calendar apps then
update/remove the existing event. This is **client-dependent** and less guaranteed than an API
`PATCH`/`DELETE` — an accepted tradeoff for a self-managed personal appointment; the user can also
edit/delete the event directly in their own calendar.

---

## 9. Integration: Email (Resend)

**Purpose:** the v1 reminder channel ([REQUIREMENTS §4.7](./REQUIREMENTS.md#47-reminders)), the
booking-confirmation email that carries the `.ics`, and lifecycle emails (welcome/opt-in).

### 9.1 Setup
- **Resend** with a **verified sending domain** (SPF + DKIM) for deliverability. (DNS is a manual
  founder step.)
- Templates authored with **React Email** in `lib/email/templates/`, rendered server-side.

### 9.2 Sending wrapper (`lib/email/resend.ts`)
A single `sendEmail()` helper that **always**:
- adds a `List-Unsubscribe` header and a visible unsubscribe link (CASL — [§11](#11-security-privacy--compliance)),
- for *reminder* types, refuses to send to a user whose `email_reminders_opt_in = false` — defense in
  depth even though the sweep already filters,
- supports attachments (used for the booking-confirmation `.ics`),
- tags messages by `type` for observability.

### 9.3 Email types (v1)
- **Welcome / opt-in confirmation** — on sign-up.
- **Booking confirmation (with `.ics` attached)** — on `confirmAppointment()`: summarizes the booked
  appointment and carries the `.ics` so the user can add it to their calendar in one tap
  ([§8.3](#83-delivery-two-channels-both-simple)). *(Sent regardless of reminder opt-in — it's a
  transactional response to the user's own action.)*
- **`due_soon`** — one week before an unbooked service's `due_date`: "Time to rebook {service} at
  {business}", with a "Book now" deep link.
- **`pre_appointment`** — before a confirmed appointment.

> Bounce/complaint handling can be added later via a Resend webhook → flip `email_reminders_opt_in`
> off. Not required for the Definition of Done.

---

## 10. Reminder scheduling engine

Two responsibilities, deliberately split: **when to create** a reminder (app logic, synchronous) and
**when to send** it (cron, asynchronous).

### 10.1 Creation (synchronous, in Server Actions)
Reminder rows are inserted by the same Server Action that changes appointment state — this keeps
scheduling logic in plain, debuggable TypeScript rather than DB triggers:
- New `due` appointment → insert `due_soon` reminder at `due_date − 7 days` (in user tz, ~9am local).
- `confirmAppointment()` → insert `pre_appointment` reminder relative to `confirmed_datetime`.
- Cancelling/completing an appointment cascades (`on delete cascade`) or marks future reminders moot.

`send_at` is computed in the user's `timezone` and stored as `timestamptz`.

### 10.2 Sending (asynchronous, daily cron)
`vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/send-reminders", "schedule": "0 13 * * *" }
  ]
}
```
- **13:00 UTC** ≈ 8–9am Eastern, a sensible "morning nudge" for the Canadian launch market.
- **Hobby/free tier constraint (verified):** Vercel crons on Hobby run **once per day with hourly
  precision**; Pro/Enterprise allow per-minute. A daily sweep is perfectly adequate for week-ahead
  reminders, so v1 ships on the free tier.
- The handler verifies `Authorization: Bearer ${CRON_SECRET}`, then with the **service-role** client:
  ```sql
  select * from reminders
  where sent = false and send_at <= now()
    and channel = 'email'
    and user_id in (select id from profiles where email_reminders_opt_in);
  ```
  For each: render template → `sendEmail()` → on success `sent=true, sent_at=now()`; on failure leave
  `sent=false`, record `last_error`, and it **retries next day** (naturally idempotent).

### 10.3 Escape hatch (documented, not built in v1)
If finer cadence is ever needed on the free tier (e.g. same-day morning-of reminders), use **Supabase
`pg_cron` + `pg_net`** to invoke an Edge Function or the API route on a per-minute schedule — entirely
inside Supabase, bypassing Vercel's Hobby limit. The channel-agnostic `reminders` table and the split
above mean adding this (or SMS/push channels) needs **no schema change**.

---

## 11. Security, privacy & compliance

Designed against [REQUIREMENTS §8](./REQUIREMENTS.md#8-legal-privacy--compliance).

- **Secrets:** the service-role key, Google **Places** API key, Resend key, and `CRON_SECRET` live
  only in Vercel env vars / server code. `lib/supabase/admin.ts` is server-only and must never be
  imported into a client component. (The Google sign-in client secret lives in the Supabase dashboard,
  not in app env.)
- **Data isolation:** RLS on every table; client limited to the anon key.
- **No third-party tokens stored.** Because calendar add is a local `.ics` export, the app holds no
  OAuth refresh tokens — one less class of sensitive secret to protect.
- **CASL (anti-spam):**
  - reminders require explicit `email_reminders_opt_in` at sign-up,
  - every email carries a working unsubscribe link + `List-Unsubscribe` header,
  - unsubscribe flips the flag off and the sweep immediately stops sending.
- **Data minimization:** Places field mask fetches only stored fields; we keep only account, spots,
  services, appointments, and spend.
- **Account & data deletion:** Settings → "Delete account" deletes the `auth.users` row;
  `on delete cascade` removes all owned rows. (Right-to-delete per the privacy requirement.) Calendar
  events already exported to the user's own calendar are theirs to remove — the app stores nothing
  about them beyond the originating appointment.
- **Third-party terms:** Places caching limits respected ([§7.4](#74-compliance--caching)); no scraping
  or stored salon credentials (auto-booking is out of scope); no Google Calendar API use in v1.
- **Transport/cron:** HTTPS only; cron endpoint authenticated by `CRON_SECRET` so it can't be triggered
  by the public.

---

## 12. Environment & configuration

Documented in `.env.example` (committed); real values in Vercel + `.env.local` (gitignored).

| Variable | Where used | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | publishable key (`sb_publishable_…`; anon role, RLS-scoped) |
| `SUPABASE_SECRET_KEY` | server only | secret key (`sb_secret_…`; service_role role — cron sweep, bypasses RLS) |
| `GOOGLE_PLACES_API_KEY` | server only | Places proxy |
| `RESEND_API_KEY` | server only | email |
| `EMAIL_FROM` | server only | verified sender, e.g. `reminders@yourdomain.ca` |
| `CRON_SECRET` | server only | authenticates the daily sweep |
| `APP_URL` | server only | absolute links in emails; host used for the `.ics` `UID` domain |

> Manual founder steps (Claude Code can guide, not perform): create a Google Cloud project + enable
> the **Places API**; set up **Google sign-in** as a provider in Supabase (a basic OAuth client — no
> sensitive-scope review needed); verify the **Resend** sending domain (DNS); and set all env vars in
> Vercel. *(No Google Calendar API, OAuth consent screen for calendar, or sensitive-scope verification
> is needed — that complexity is removed by the `.ics` approach.)*

---

## 13. Key decisions & tradeoffs

| # | Decision | Alternatives considered | Why / tradeoff |
|---|----------|------------------------|----------------|
| 1 | **Materialized `appointments` rows** with a `due→booked→completed` state machine | Compute due dates on the fly from `services` + last visit | Materialized rows give clean reminder targeting, spend history, and calendar linkage. **Cost:** must "roll forward" the next cycle on completion (one insert). Worth it. |
| 2 | **One-way `.ics` calendar export** (not Google Calendar OAuth sync) | OAuth auto-sync via the Google Calendar API (the original §4.6 plan) | No Google sensitive-scope verification gating launch, works with every calendar app, and removes all token storage/encryption/refresh and the `connect/disconnect` flow. **Cost:** one-way export, not live sync; edits/cancellations are best-effort via `UID`+`SEQUENCE` ([§8.4](#84-edits--cancellations-best-effort)). |
| 3 | **Daily Vercel Cron** for reminders | Supabase `pg_cron`; external scheduler (GitHub Actions/Upstash) | Free-tier Hobby allows once-daily, which is fine for week-ahead nudges; zero new infra. **Cost:** no sub-daily timing until Pro or `pg_cron` ([§10.3](#103-escape-hatch-documented-not-built-in-v1) escape hatch documented). |
| 4 | **Server-side Places proxy + session tokens + field mask** | Google JS Places widget in the browser | Hides the API key, minimizes billed fields and stored data. **Cost:** two thin routes to maintain. |
| 5 | **RLS-first authorization** (anon key on client, service-role only on the cron path) | App-layer ownership checks only | DB-enforced isolation survives app bugs; Supabase-native. **Cost:** must remember the service role bypasses RLS — confined to the cron route. |
| 6 | **Frequency as `value` + `unit`** | Raw `interval`/day-count | Honest UI ("every 5 weeks") and calendar-correct month math. **Cost:** a small conversion function. |
| 7 | **Reads via Server Components/RLS, writes via Server Actions** | Full REST/GraphQL API; or all client-side writes | Thin client, trusted business logic, no hand-written API layer. **Cost:** mutations are server round-trips (fine here). |
| 8 | **Channel-agnostic `reminders` table** (email only active) | Email-specific columns | Push/SMS later with **no schema change** (matches "design for additional channels"). |
| 9 | **Single Next.js app on Vercel** | Separate API service / microservices | Lowest ops for a solo builder; everything in one deploy. **Cost:** scaling limits are far beyond v1 needs. |
| 10 | **PWA, mobile-first** | Native iOS/Android now | Matches requirements; one codebase, installable. **Cost:** web push only (deferred) and iOS PWA quirks. |
| 11 | **Pure, I/O-free `lib/domain/` + `lib/calendar/ics.ts`** | Logic inline in actions / DB triggers | Unit/snapshot-testable cadence math and `.ics` output — the riskiest logic — without DB/network. **Cost:** a little indirection. |

---

## 14. Assumptions & open questions

**Assumptions made (sensible defaults; easy to change):**
- Default appointment **duration = 60 min** for calendar events (editable per appointment).
- Reminder lead time is **fixed at 7 days** per requirements; modeled as data so it can become a
  per-user/per-service setting later.
- Currency defaults to **CAD**; timezone defaults to **America/Toronto**, captured from the browser at
  sign-up and editable in Settings.
- Calendar add is via `.ics`; the event lands in whichever calendar app the user opens the file with
  (Google / Apple / Outlook). The app does not confirm the import succeeded.
- Docs folder named **`docs/`** (holds `REQUIREMENTS.md` + `DESIGN.md` and future planning docs).

**Open questions (don't block v1):**
- **First due date when there's no prior appointment.** Plan: optional `services.anchor_date`
  ("when did you last go?") seeds it; if omitted, the service shows as "due now" / prompts the user.
  Confirm this UX.
- **Monetization** ([REQUIREMENTS §11](./REQUIREMENTS.md#11-open-decisions)) — undecided; doesn't affect the
  v1 schema.
- **Bounce/complaint handling** via Resend webhook — nice-to-have, not in the Definition of Done.
- **`.ics` timezone representation** — embed a full `VTIMEZONE` block vs. emit UTC times. UTC is
  simplest and unambiguous; revisit if clients display the wrong local time.

---

## 15. Suggested build order

Each step maps to part of the [Definition of Done](./REQUIREMENTS.md#12-definition-of-done-v1) and is
independently shippable.

1. **Project + auth skeleton** — Next.js + `@supabase/ssr`, email/password + Google sign-in,
   `profiles` trigger, middleware guard, PWA manifest.
2. **Schema + RLS** — migrations for all tables ([§4](#4-data-model)), enums, indexes, policies;
   generate TS types.
3. **Spots + Places** — server proxy routes, search/add UI, services + booking method.
4. **Scheduling core** — `lib/domain/scheduling.ts` (+ unit tests), create first `due` appointment and
   its `due_soon` reminder; **dashboard** sorted by `due_date`.
5. **Confirm / complete flow** — Server Actions, spend entry, roll-forward to next cycle.
6. **Email reminders** — Resend setup, templates, daily cron, opt-in + unsubscribe.
7. **Calendar export (.ics)** — `lib/calendar/ics.ts`, the `text/calendar` download route, and the
   booking-confirmation email with the `.ics` attached on confirm.
8. **Spend reporting** — totals, per-spot/service, monthly.
9. **Privacy hardening** — account/data deletion, final CASL pass.

> At the end of step 7 the full Definition-of-Done loop works end to end; steps 8–9 complete the v1
> requirements.
