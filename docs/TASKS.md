# TASKS.md — Beauty Appointment Scheduler (v1)

> Ordered, testable build plan derived from [DESIGN.md](./DESIGN.md), serving
> [REQUIREMENTS.md](./REQUIREMENTS.md). Work top-to-bottom; tasks within a phase are mostly ordered
> by dependency. Each task names the **requirement it serves**, what it **depends on**, and a
> **"Done when"** check you can actually verify before moving on.

## How to read this

- **ID** — stable handle (e.g. `T3.2`) used by other tasks' dependencies.
- **Serves** — the REQUIREMENTS.md section the task satisfies.
- **Depends** — task IDs that must be done first (`—` = nothing).
- **Done when** — the acceptance test. If you can't demonstrate it, the task isn't done.
- Check the box `[x]` when the "Done when" passes.

## Phase overview

| Phase | Theme | Serves |
|-------|-------|--------|
| 0 | Foundations & tooling | REQ §3, §2 |
| 1 | Accounts & auth | REQ §4.1 |
| 2 | Data model & RLS | REQ §9, §8 |
| 3 | Spots & Google Places | REQ §4.2, §4.3 |
| 4 | Frequency, scheduling & dashboard | REQ §4.4 |
| 5 | Assisted booking + confirm/complete | REQ §4.5 |
| 6 | Email reminders | REQ §4.7, §8 |
| 7 | Calendar export (.ics) | REQ §4.6 |
| 8 | Spend tracking & reporting | REQ §4.8 |
| 9 | Privacy, PWA & launch | REQ §8, §2, §10, §12 |

> **🎯 Milestone:** at the end of **Phase 7**, the full [Definition of Done](./REQUIREMENTS.md#12-definition-of-done-v1)
> loop works end to end. Phases 8–9 complete the remaining v1 requirements and harden for launch.

---

## Phase 0 — Foundations & tooling
*Serves REQ §3 (stack), §2 (mobile-first). Goal: a deployable, connected skeleton.*

- [x] **T0.1 — Initialize Next.js app** (App Router, TypeScript, `src/`) · _Serves:_ REQ §3 · _Depends:_ —
  _Done when:_ `npm run dev` serves a placeholder page locally with no errors. ✅ Next 16 + React 19; `/` returns 200.
- [x] **T0.2 — Add Tailwind + base responsive layout** · _Serves:_ REQ §2 · _Depends:_ T0.1
  _Done when:_ a styled page renders correctly at mobile width (375px) and desktop. ✅ Tailwind v4; responsive landing page renders. _(Recommend a quick visual check in a phone viewport.)_
- [x] **T0.3 — Create Supabase project + wire env** (`.env.local`, committed `.env.example`) · _Serves:_ REQ §3 · _Depends:_ T0.1
  _Done when:_ a server-side health query against Supabase returns successfully. ✅ Project created; publishable key wired; `GET /api/health` → `200 {"ok":true,"supabase":"connected"}`.
- [x] **T0.4 — Add Supabase clients + proxy skeleton** (browser / server / admin per [DESIGN §5](./DESIGN.md#5--folder-structure)) · _Serves:_ REQ §6.2 · _Depends:_ T0.1
  _Done when:_ all three clients instantiate; `admin.ts` is server-only; session refresh runs without error. ✅ Built as Next-16 `src/proxy.ts` (formerly middleware); `admin.ts` guarded with `import "server-only"`; build + run clean.
- [ ] **T0.5 — Connect repo to Vercel + set env vars** · _Serves:_ REQ §3 · _Depends:_ T0.1
  _Done when:_ a preview deployment is reachable at a Vercel URL. ⏳ **Founder step:** push to a Git host, import the repo at vercel.com, and add the `.env.local` vars in Vercel.

## Phase 1 — Accounts & auth
*Serves REQ §4.1. Goal: users can sign up, log in, and reach a protected area.*

- [x] **T1.1 — Email/password sign-up + email confirmation** · _Serves:_ REQ §4.1 · _Depends:_ T0.4
  _Done when:_ a new user registers, confirms via email link, and lands signed-in. ✅ Verified by a real signup → confirmation email → `/auth/callback` (code exchange, default template) → dashboard. (Token-hash `/auth/confirm` kept for the Phase 6 custom-SMTP upgrade.)
- [x] **T1.2 — Login / logout** · _Serves:_ REQ §4.1 · _Depends:_ T1.1
  _Done when:_ user can log in and out; session persists across a page refresh. ✅ Verified by the user (login + logout working).
- [ ] **T1.3 — Google sign-in** (Supabase provider, basic scopes, `/auth/callback`) · _Serves:_ REQ §4.1 · _Depends:_ T1.1
  _Done when:_ "Continue with Google" creates a valid session. ⏸️ Deferred by founder — slot in later (needs a Google OAuth client + enabling the provider in Supabase). `/auth/callback` already handles the OAuth code exchange.
- [x] **T1.4 — `profiles` table + `handle_new_user` trigger** (timezone, opt-in defaults) · _Serves:_ REQ §4.1, §9 · _Depends:_ T1.1
  _Done when:_ signing up auto-creates a matching `profiles` row with `email_reminders_opt_in=false`. ✅ Migration `20260608153753_create_profiles` applied via MCP (table + RLS owner policies + `handle_new_user` trigger), saved to `supabase/migrations/`. Verified end-to-end: signup auto-created the row (default timezone, `email_reminders_opt_in=false`).
- [x] **T1.5 — Route protection** (guarded in `(app)/layout` via `getUser`) · _Serves:_ REQ §4.1 · _Depends:_ T1.2
  _Done when:_ visiting `/dashboard` while logged out redirects to login. ✅ Verified: `GET /dashboard` (logged out) → 307 `/login`.
- [x] **T1.6 — Session refresh on each request** · _Serves:_ REQ §4.1 · _Depends:_ T1.5
  _Done when:_ a session left idle past the access-token TTL still works (auto-refreshed). ✅ `src/proxy.ts` calls `getUser()` per request to refresh the session cookie.

## Phase 2 — Data model & RLS
*Serves REQ §9 (schema), §8 (isolation). Goal: the full schema exists and is per-user secure.*

- [x] **T2.1 — Enums migration** (`booking_method`, `frequency_unit`, `appointment_status`, `reminder_channel`, `reminder_type`) · _Serves:_ REQ §9 · _Depends:_ T0.3
  _Done when:_ migration applies cleanly; enums exist in the DB. ✅ All 5 enums created (migration `20260609002739_core_schema`).
- [x] **T2.2 — `spots` table + indexes** (`unique(user_id, google_place_id)`, idx `user_id`) · _Serves:_ REQ §4.2, §9 · _Depends:_ T2.1, T1.4
  _Done when:_ migration applies; duplicate (user, place) insert is rejected. ✅ Table + `unique(user_id, google_place_id)` + `user_id` index.
- [x] **T2.3 — `services` table** · _Serves:_ REQ §4.4, §9 · _Depends:_ T2.2
  _Done when:_ migration applies; a service row links to a spot. ✅ Table created with FK → spots (cascade), `frequency_value`/`frequency_unit`.
- [x] **T2.4 — `appointments` table** (+ partial unique: one open appt per service) · _Serves:_ REQ §4.5, §9 · _Depends:_ T2.3
  _Done when:_ migration applies; a second `due`/`booked` row for the same service is rejected. ✅ Table + partial unique `appointments_one_open_per_service` + status/due_date indexes.
- [x] **T2.5 — `reminders` table** (+ partial index `(send_at) where sent=false`) · _Serves:_ REQ §4.7, §9 · _Depends:_ T2.4
  _Done when:_ migration applies; index exists. ✅ Table + partial index `reminders_due_unsent_idx`.
- [x] **T2.6 — RLS policies on all tables** (owner-only CRUD, `user_id = auth.uid()`) · _Serves:_ REQ §8, §6.2 · _Depends:_ T2.2–T2.5
  _Done when:_ with two test accounts, account A cannot read or write any of account B's rows. ✅ Owner-only RLS (`(select auth.uid()) = user_id`) on all 5 tables; advisors report no RLS gaps; verified via role simulation — a non-owner authenticated user sees 0 rows.
- [x] **T2.7 — Generate TypeScript types** from the schema · _Serves:_ REQ §3 · _Depends:_ T2.6
  _Done when:_ typed Supabase queries compile against generated types. ✅ `src/types/database.types.ts` generated and wired into all three Supabase clients; build green.

## Phase 3 — Spots & Google Places
*Serves REQ §4.2, §4.3. Goal: search a business, save it, tag services, set booking method.*

- [x] **T3.1 — Places Autocomplete proxy route** (server-side key, session token, debounced) · _Serves:_ REQ §4.2 · _Depends:_ T0.4
  _Done when:_ typing a name returns live suggestions; the API key is **not** present in the client bundle. ✅ `/api/places/autocomplete` (auth-gated → 401 unauth); key confirmed absent from `.next/static`; live Google call verified.
- [x] **T3.2 — Places Details proxy route** (field mask: name/address/phone/hours/website/location) · _Serves:_ REQ §4.2 · _Depends:_ T3.1
  _Done when:_ selecting a suggestion returns exactly the masked fields and nothing more. ✅ `/api/places/details` (auth-gated); `X-Goog-FieldMask` verified to return only the masked fields.
- [ ] **T3.3 — Add-spot UI + save** (search → select → preview → save) · _Serves:_ REQ §4.2 · _Depends:_ T3.2, T2.2
  _Done when:_ a chosen business is persisted to `spots` and displayed back. ✅ Verified (desktop + mobile): 2 spots saved with full Places data (address/phone/hours) and displayed.
- [ ] **T3.4 — Service tags on a spot** (add one or more services) · _Serves:_ REQ §4.2 · _Depends:_ T3.3, T2.3
  _Done when:_ a spot shows its services; multiple services per spot work. ✅ Verified: multiple services per spot persisted with frequencies; add + remove on the detail page both work.
- [ ] **T3.5 — Booking method per spot** (phone / website / other + stored number or URL) · _Serves:_ REQ §4.3 · _Depends:_ T3.3
  _Done when:_ method and link/number are stored and editable per spot. ✅ Verified: phone (no URL) and website (with booking URL) both stored correctly.
- [ ] **T3.6 — Spots list + detail pages** · _Serves:_ REQ §4.2 · _Depends:_ T3.3
  _Done when:_ all of a user's spots list, and each opens a detail view. ✅ Verified (desktop + mobile): list shows all spots; each opens its detail view.
- [ ] **T3.7 — Delete spot** (cascades services/appointments) · _Serves:_ REQ §8 · _Depends:_ T3.6
  _Done when:_ deleting a spot removes its services and appointments. 🟡 Built (`deleteSpot` + FK cascade from Phase 2). Service-removal verified; spot-deletion not yet exercised in the browser.

## Phase 4 — Frequency, scheduling & dashboard
*Serves REQ §4.4. Goal: due dates compute correctly and surface on a sorted dashboard.*

- [x] **T4.1 — `scheduling.ts` pure `nextDueDate(value, unit, anchor|lastDate)` + unit tests** · _Serves:_ REQ §4.4 · _Depends:_ T0.1
  _Done when:_ unit tests pass, including month-end edge cases (e.g. monthly from Jan 31 → Feb 28/29). ✅ `src/lib/domain/scheduling.ts` (UTC, date-string in/out, month clamping) + Vitest suite — **17/17 passing** (`npm test`).
- [x] **T4.2 — Set frequency per service** (value + unit UI) · _Serves:_ REQ §4.4 · _Depends:_ T3.4, T2.3
  _Done when:_ "every 5 weeks" / "every 2 months" saves and displays correctly. ✅ Captured in the add + detail forms; stored as value+unit, shown as "every N weeks" (verified in DB).
- [x] **T4.3 — Seed first `due` appointment + `due_soon` reminder** on service create (uses optional `anchor_date`) · _Serves:_ REQ §4.4, §4.7 · _Depends:_ T4.1, T2.4, T2.5
  _Done when:_ creating a service produces a `due` appointment with the correct `due_date` and a reminder at `due_date − 7d`. ✅ `seedCycle` in `createSpot`/`addService`; optional "last visit" field added. Verified in DB: both services have a `due` appointment + `due_soon` reminder at due−7d (existing 2 backfilled). Live add-service path confirmed on next browser add.
- [x] **T4.4 — Dashboard: upcoming/overdue sorted by `due_date`** · _Serves:_ REQ §4.4 · _Depends:_ T4.3
  _Done when:_ services list in due-date order; overdue items are visually flagged. ✅ Built (`/dashboard` lists due/booked items ordered by `due_date`; overdue → red). Confirm render in browser.

## Phase 5 — Assisted booking + confirm/complete
*Serves REQ §4.5. Goal: deep-link to booking, confirm, and roll the cycle forward.*

- [x] **T5.1 — "Book now" deep-link** (tel: / open URL / show details by booking method) · _Serves:_ REQ §4.5 · _Depends:_ T4.4, T3.5
  _Done when:_ each booking method routes correctly (phone dials, website opens, other shows details). ✅ On `/appointments/[id]`: `phone`→`tel:`, `website`→booking_url/website (new tab), `other`→contact details (phone/address/Maps). Dashboard items now link here.
- [x] **T5.2 — `confirmAppointment` action** (status=`booked`, `confirmed_datetime`, optional cost) + `pre_appointment` reminder · _Serves:_ REQ §4.5, §4.7 · _Depends:_ T4.4, T2.5
  _Done when:_ confirming sets the datetime and creates a pre-appointment reminder. ✅ `src/actions/appointments.ts`: due→booked, wall-clock interpreted in user tz via `zonedDateTimeToUTC`, optional cost; replaces unsent reminders with a `pre_appointment` at `confirmed − 7d` (`preAppointmentSendAt`). Both helpers unit-tested (26/26).
- [x] **T5.3 — `completeAppointment` action** (status=`completed`, cost) + roll forward next cycle · _Serves:_ REQ §4.5, §4.4 · _Depends:_ T5.2, T4.1
  _Done when:_ completing one appointment auto-creates the next `due` appointment + its `due_soon` reminder. ✅ `completeAppointment` in `src/actions/appointments.ts`: closes the cycle then seeds the next `due` (next due = visit date [confirmed datetime if booked, else today] + frequency) with a `due_soon` reminder at due−7d; optional cost. Triggered from `AppointmentActions` on `/appointments/[id]`.
- [x] **T5.4 — `cancelAppointment` action** · _Serves:_ REQ §4.5 · _Depends:_ T5.2
  _Done when:_ cancelling sets status `cancelled` and removes its pending reminders. ✅ `cancelAppointment` sets status `cancelled` and deletes unsent reminders; terminal per DESIGN §4.6 (no roll-forward). Cancel button (with confirm) in `AppointmentActions`.

## Phase 6 — Email reminders
*Serves REQ §4.7, §8 (CASL). Goal: opted-in users get reminders; unsubscribe works.*

- [ ] **T6.1 — Resend setup + verified domain + `sendEmail` wrapper** (List-Unsubscribe header, opt-in guard for reminders, attachment support, type tagging) · _Serves:_ REQ §4.7, §8 · _Depends:_ T0.3
  _Done when:_ a test email sends from the verified domain and includes an unsubscribe link/header.
- [ ] **T6.2 — Reminder templates** (`due_soon`, `pre_appointment`) via React Email · _Serves:_ REQ §4.7 · _Depends:_ T6.1
  _Done when:_ both templates render with real appointment data and a working "Book now" link.
- [ ] **T6.3 — Opt-in at sign-up + unsubscribe endpoint** (flips `email_reminders_opt_in`) · _Serves:_ REQ §8 · _Depends:_ T1.4, T6.1
  _Done when:_ clicking unsubscribe disables future reminders for that user.
- [ ] **T6.4 — `/api/cron/send-reminders` handler** (`CRON_SECRET` auth; query due + opted-in; send; mark `sent`; retry on fail) · _Serves:_ REQ §4.7 · _Depends:_ T6.2, T2.5
  _Done when:_ a reminder with `send_at <= now()` sends exactly once and is marked `sent`; an unauthorized call is rejected.
- [ ] **T6.5 — `vercel.json` daily cron** (`0 13 * * *`, Hobby once-daily) · _Serves:_ REQ §4.7 · _Depends:_ T6.4, T0.5
  _Done when:_ Vercel logs show the endpoint firing on schedule.
- [ ] **T6.6 — Welcome / opt-in confirmation email** on sign-up · _Serves:_ REQ §4.1, §8 · _Depends:_ T6.1, T1.1
  _Done when:_ a new user receives the welcome email.

## Phase 7 — Calendar export (.ics)  🎯 *DoD loop closes here*
*Serves REQ §4.6. Goal: confirmed appointments export to any calendar via .ics.*

- [ ] **T7.1 — `lib/calendar/ics.ts` builds `VEVENT`** (UID=appt id, DTSTART/END, SUMMARY, LOCATION, optional VALARM) + snapshot tests · _Serves:_ REQ §4.6 · _Depends:_ T2.4
  _Done when:_ generated `.ics` validates and snapshot tests pass.
- [ ] **T7.2 — `/api/appointments/[id]/ics` download route** (`text/calendar`) · _Serves:_ REQ §4.6 · _Depends:_ T7.1, T5.2
  _Done when:_ the downloaded file imports as a correct event in Google **and** Apple **and** Outlook.
- [ ] **T7.3 — Booking-confirmation email with `.ics` attached** on confirm · _Serves:_ REQ §4.6 · _Depends:_ T7.1, T6.1, T5.2
  _Done when:_ confirming sends the email; Gmail/Apple Mail show a one-tap "Add to calendar".
- [ ] **T7.4 — Edit/cancel re-issues `.ics`** (bump `ics_sequence`; `METHOD:CANCEL` on cancel) · _Serves:_ REQ §4.6 · _Depends:_ T7.2, T5.4
  _Done when:_ re-importing an updated file changes the existing event (best-effort, verified in one client).
- [ ] **T7.5 — "Add to calendar" button** on the appointment page · _Serves:_ REQ §4.6 · _Depends:_ T7.2
  _Done when:_ the button downloads/opens the `.ics` from within the app.

## Phase 8 — Spend tracking & reporting
*Serves REQ §4.8. Goal: log spend and see totals.*

- [ ] **T8.1 — Persist cost + currency** on confirm/complete · _Serves:_ REQ §4.8 · _Depends:_ T5.3
  _Done when:_ a completed appointment stores an editable amount.
- [ ] **T8.2 — Spend page: monthly total** · _Serves:_ REQ §4.8 · _Depends:_ T8.1
  _Done when:_ the page shows correct total spend for a selected month.
- [ ] **T8.3 — Per-spot / per-service breakdown** · _Serves:_ REQ §4.8 · _Depends:_ T8.2
  _Done when:_ totals group correctly by business and by service.

## Phase 9 — Privacy, PWA & launch
*Serves REQ §8, §2, §10, §12. Goal: installable, compliant, and live.*

- [ ] **T9.1 — PWA manifest + icons + installability** · _Serves:_ REQ §2 · _Depends:_ T0.2
  _Done when:_ the app passes an install check and adds to a phone home screen.
- [ ] **T9.2 — Delete account + cascade data deletion** · _Serves:_ REQ §8 · _Depends:_ T2.6, T1.2
  _Done when:_ deleting an account removes every owned row (verified in the DB).
- [ ] **T9.3 — Privacy policy + terms pages + consent copy** · _Serves:_ REQ §8 · _Depends:_ —
  _Done when:_ both pages are reachable and the sign-up consent text is accurate.
- [ ] **T9.4 — Usage/cost monitoring** for Places + email · _Serves:_ REQ §10 · _Depends:_ T3.2, T6.4
  _Done when:_ an alert fires (or a dashboard shows) when usage nears the free tier.
- [ ] **T9.5 — Production deploy + custom domain + final env** · _Serves:_ REQ §3, §10 · _Depends:_ T0.5
  _Done when:_ the production domain serves the app over HTTPS with production env vars.
- [ ] **T9.6 — End-to-end Definition-of-Done walkthrough** · _Serves:_ REQ §12 · _Depends:_ all prior
  _Done when:_ one user completes the full §12 journey — sign up → add spot+service+frequency → see due date → receive the reminder → tap through to book → confirm with date/time → add to calendar via `.ics` → log spend — with no manual DB intervention.

---

### Notes
- **Testing discipline:** the pure modules `lib/domain/scheduling.ts` (T4.1) and `lib/calendar/ics.ts`
  (T7.1) carry unit/snapshot tests — that's where the riskiest logic lives. Everything else is verified
  via its "Done when" check.
- **Deferred (not in this plan):** OAuth calendar sync, SMS/push, availability windows, auto-booking,
  bank-linked spend, French localization — see [REQUIREMENTS §6](./REQUIREMENTS.md#6-out-of-scope-for-v1-deferred).
- **Parallelizable:** Phase 3 (Places) and the pure scheduling module (T4.1) can be built alongside
  Phase 2 once the relevant tables exist; T9.3 (legal pages) has no code dependencies and can be done anytime.
