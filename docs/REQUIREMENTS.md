# REQUIREMENTS.md — Beauty Appointment Scheduler (v1)

## 1. Overview

A scheduling app that helps users manage recurring beauty appointments (nails, waxing, laser, hair, etc.). The user saves the businesses they regularly visit, sets how often they want each service, and the app tracks when each appointment is due, reminds them ahead of time, links them straight to the booking method, lets them log spend, and helps them add confirmed appointments to their calendar.

**v1 goal:** ship a simple, legal, genuinely useful "memory + nudge" tool. True automatic booking is intentionally **out of scope for v1** (see Section 6).

## 2. Target user & context

- **Audience:** public commercial app (general consumers).
- **Region:** Canada (English first; French/Quebec support deferred — see Section 8).
- **Platform:** **web app** (mobile-first, runs in the phone browser, installable as a PWA). Native iOS/Android deferred until after v1 succeeds and developers are hired.
- **Builder:** founder with limited technical background, building v1 with Claude Code. Scope must stay simple.

## 3. Recommended tech stack (Claude-Code-friendly, low-ops)

These are recommendations chosen for a solo, light-technical builder. Not final.

- **Frontend/framework:** Next.js (React).
- **Auth + database:** Supabase (handles sign-up/login and Postgres database without managing servers).
- **Hosting/deploy:** Vercel.
- **Email reminders:** a transactional email provider (e.g. Resend).
- **External APIs:** Google Places API (search). Calendar add is handled by a generated **`.ics` file** — no Google Calendar API or OAuth (see Section 4.6 / DESIGN.md §8).

> Note: API keys, billing setup, and OAuth configuration are manual steps the founder must complete (Claude Code can guide but cannot create paid accounts or enter credentials).

## 4. v1 scope — in scope

### 4.1 Accounts
- User can sign up and log in (email + password, or Google sign-in).
- Each user has a private profile holding their saved spots and appointments.

### 4.2 Add a "spot" (saved business)
- User searches a business by name (Google Places API), like in Google Maps.
- Search results show matching businesses; user selects the correct one.
- On selection, the app saves and displays the business details: **name, address, phone number, operating hours**, and (if available) website/booking URL.
- User tags the spot with one or more **services** they get there (e.g. pedicure, manicure, waxing, laser, hair).
- User can save multiple spots, each with its own service tags.

### 4.3 Booking method per spot
- For each spot, the app stores how booking is done. One of:
  - **Phone** (store phone number),
  - **Website/form or booking platform** (store the booking URL),
  - **Other / unknown**.
- This drives the "Book now" action in Section 4.5.

### 4.4 Frequency & due dates
- For each spot/service, user sets a desired frequency (e.g. nails every 5 weeks, waxing every 6 weeks).
- The app computes the **next due date** for each service: `last appointment date + frequency interval`.
- A dashboard shows upcoming/overdue services sorted by due date.

### 4.5 Booking (assisted — NOT automatic in v1)
- Each due/upcoming item has a **"Book now"** action.
- "Book now" deep-links the user to the appropriate method:
  - Phone → tap-to-call the stored number,
  - Website/platform → open the stored booking URL,
  - Other → show stored details.
- **The user books externally and confirms the appointment.** The app does not place bookings itself in v1.
- After booking, the user marks the appointment as **confirmed** and enters the **confirmed date and time** (and optionally the expected/actual cost).

### 4.6 Calendar integration (.ics export)
- When the user confirms a booked appointment, the app generates a standard **calendar file (`.ics`)** with the appointment details, which the user adds to **any** calendar (Google, Apple, Outlook) themselves.
- The event includes: service, business name, address/location, date/time, and an optional in-event reminder/alarm.
- Delivery: an in-app **"Add to calendar"** download button, **and** the `.ics` **attached to the booking-confirmation email** (Gmail/Apple Mail show an inline "Add to calendar" action).
- No Google calendar sign-in, OAuth consent, or "connect/disconnect" step is required.
- **Note:** this is a one-time export, not a live two-way sync; edits/cancellations re-issue an updated `.ics` (best-effort). OAuth-based auto-sync is deferred (see Section 6). Rationale and tradeoffs: DESIGN.md §8.

### 4.7 Reminders
- The app sends a reminder **one week before** each appointment's due date (for items not yet booked) and before confirmed appointments.
- **v1 channel: email** (cheapest, simplest, opt-in at sign-up).
- Push and SMS are deferred (see Section 6); design the reminder system so additional channels can be added later.

### 4.8 Spend tracking
- For each completed appointment, the user **manually enters** the amount spent.
- The app shows total and per-spot / per-service spend over time (e.g. monthly total, spend per business).
- Automatic bank-linked spend detection is out of scope.

## 5. Core user flow (v1)

1. User signs up and logs in.
2. User searches and adds their regular spots, tagging each with services and a booking method.
3. User sets a frequency for each service.
4. App computes next due dates and shows a dashboard.
5. One week before due, app emails a reminder.
6. User taps "Book now," is sent to phone/website, books externally.
7. User confirms in the app and enters the date/time (+ cost).
8. App generates a calendar (`.ics`) file the user adds to their calendar, and schedules the next cycle.

## 6. Out of scope for v1 (deferred)

- **Automatic / zero-touch booking** of any kind (this is the hard, legally sensitive part — pursued later via official platform partnerships, not scraping or bots).
- **AI voice agent** that phones salons.
- **Web-form automation / scraping** of booking sites.
- **SMS reminders** (cost per message + CASL consent handling).
- **Push notifications** (add after email is working).
- **Live two-way calendar sync via Google Calendar OAuth** — v1 uses one-way `.ics` export instead (see Section 4.6). OAuth auto-sync requires Google's sensitive-scope verification and per-user token management; deferred until the added value justifies that cost and review.
- **Monthly availability windows** (e.g. "2nd Wednesday after 5 PM," "Saturdays 10 AM–2 PM"). This feature only becomes useful once auto-booking exists — there is nothing to match availability against in v1. Deferred together with auto-booking.
- **Automatic spend tracking** via bank linking.
- **Native iOS/Android apps.**
- **French / Quebec localization** (see Section 8).

## 7. Path toward automatic booking (post-v1, informational)

Real auto-booking should be earned through **official integrations**, not technical workarounds:
- Pursue partner programs / APIs with platforms common in Canadian beauty (e.g. Fresha, Booksy, Square Appointments, Vagaro).
- This is a business-development effort and should follow v1 traction.
- Phone-only bookings have no clean automated path; treat any voice solution as a risky, consent-based premium experiment, not a core feature.

## 8. Legal, privacy & compliance notes

- **CASL (Canada anti-spam):** reminders go only to users who opted in at sign-up. Keep clear opt-in and easy unsubscribe in all emails. (Relevant again later for SMS and for any outreach to businesses.)
- **Privacy:** store only what's needed (user account, saved spots, appointments, spend). Provide a way to delete account and data.
- **Third-party terms:** comply with Google Places API terms. (v1 calls no Google Calendar API — calendar add is via a locally generated `.ics` file.)
- **Quebec / Bill 96:** French-language support will be required to serve Quebec broadly; deferred for v1 but noted as a known future obligation.

## 9. Data model (sketch)

- **users** — id, email, auth info, reminder preferences, timezone (no calendar-connection state needed with `.ics`).
- **spots** — id, user_id, business name, address, phone, hours, website/booking URL, booking_method (phone | website | other), Google Place ID.
- **services** — id, spot_id, service name (e.g. pedicure), frequency_interval (e.g. 5 weeks).
- **appointments** — id, user_id, spot_id, service_id, status (due | booked | completed), due_date, confirmed_datetime, cost. (The generated `.ics` uses the appointment id as its UID; a sequence counter supports best-effort edits.)
- **reminders** — id, appointment_id, channel (email), send_at, sent_flag.

## 10. Costs to budget for (v1)

- Google Places API: free tier, then pay-per-search.
- Email provider: free/low tier at small scale.
- Hosting (Vercel) and Supabase: free tiers cover early stage.
- Domain name (optional but recommended).

## 11. Open decisions

- **Monetization:** not yet decided (free/ads, subscription, or a cut of bookings). Does not block v1 build, but affects later choices like whether to pursue platform partnerships.

## 12. Definition of done (v1)

A user can: sign up, add at least one spot with a service and frequency, see its next due date on a dashboard, receive an email reminder one week before, tap through to the booking method, confirm the appointment with a date/time, add it to their calendar via the generated `.ics` file, and log what they spent.
