-- Phase 2 — Core data model: spots, services, appointments, reminders.
-- Enums, tables, indexes, and owner-only RLS. (profiles created earlier.)
-- All user-owned tables carry user_id (denormalized) for simple, fast RLS.
-- Applied to the remote project (hsjaqjeejcamxztauxbj) via the Supabase MCP.

------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------
create type public.booking_method     as enum ('phone', 'website', 'other');
create type public.frequency_unit     as enum ('day', 'week', 'month');
create type public.appointment_status as enum ('due', 'booked', 'completed', 'cancelled');
create type public.reminder_channel   as enum ('email', 'sms', 'push');   -- only 'email' active in v1
create type public.reminder_type      as enum ('due_soon', 'pre_appointment');

------------------------------------------------------------------------
-- spots — a saved business (from Google Places)
------------------------------------------------------------------------
create table public.spots (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  google_place_id   text,
  name              text not null,
  formatted_address text,
  latitude          double precision,
  longitude         double precision,
  phone             text,
  website_url       text,
  booking_url       text,
  booking_method    public.booking_method not null default 'other',
  opening_hours     jsonb,
  google_maps_uri   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, google_place_id)
);
comment on table public.spots is 'A business the user saves and visits (Places data). T2.2.';
create index spots_user_id_idx on public.spots (user_id);

alter table public.spots enable row level security;
create policy "spots: owner select" on public.spots for select to authenticated using ((select auth.uid()) = user_id);
create policy "spots: owner insert" on public.spots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "spots: owner update" on public.spots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "spots: owner delete" on public.spots for delete to authenticated using ((select auth.uid()) = user_id);

create trigger spots_set_updated_at before update on public.spots for each row execute function public.set_updated_at();

------------------------------------------------------------------------
-- services — a service the user gets at a spot, with cadence
------------------------------------------------------------------------
create table public.services (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  spot_id         uuid not null references public.spots (id) on delete cascade,
  name            text not null,
  frequency_value integer not null check (frequency_value > 0),
  frequency_unit  public.frequency_unit not null,
  anchor_date     date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.services is 'A recurring service at a spot, with its frequency. T2.3.';
create index services_user_id_idx on public.services (user_id);
create index services_spot_id_idx on public.services (spot_id);

alter table public.services enable row level security;
create policy "services: owner select" on public.services for select to authenticated using ((select auth.uid()) = user_id);
create policy "services: owner insert" on public.services for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "services: owner update" on public.services for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "services: owner delete" on public.services for delete to authenticated using ((select auth.uid()) = user_id);

create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();

------------------------------------------------------------------------
-- appointments — materialized per-cycle row (state machine)
------------------------------------------------------------------------
create table public.appointments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  spot_id            uuid not null references public.spots (id) on delete cascade,
  service_id         uuid not null references public.services (id) on delete cascade,
  status             public.appointment_status not null default 'due',
  due_date           date not null,
  confirmed_datetime timestamptz,
  duration_minutes   integer not null default 60 check (duration_minutes > 0),
  cost               numeric(10,2) check (cost >= 0),
  currency           text not null default 'CAD',
  ics_sequence       integer not null default 0,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.appointments is 'One row per appointment cycle; due -> booked -> completed. T2.4.';
create index appointments_user_status_due_idx on public.appointments (user_id, status, due_date);
create index appointments_spot_id_idx on public.appointments (spot_id);
create index appointments_service_id_idx on public.appointments (service_id);
-- At most one open (due/booked) appointment per service.
create unique index appointments_one_open_per_service on public.appointments (service_id) where status in ('due', 'booked');

alter table public.appointments enable row level security;
create policy "appointments: owner select" on public.appointments for select to authenticated using ((select auth.uid()) = user_id);
create policy "appointments: owner insert" on public.appointments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "appointments: owner update" on public.appointments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "appointments: owner delete" on public.appointments for delete to authenticated using ((select auth.uid()) = user_id);

create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

------------------------------------------------------------------------
-- reminders — scheduled nudges (channel-agnostic)
------------------------------------------------------------------------
create table public.reminders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  type           public.reminder_type not null,
  channel        public.reminder_channel not null default 'email',
  send_at        timestamptz not null,
  sent           boolean not null default false,
  sent_at        timestamptz,
  last_error     text,
  created_at     timestamptz not null default now()
);
comment on table public.reminders is 'Scheduled reminder per appointment; channel-agnostic. T2.5.';
create index reminders_appointment_id_idx on public.reminders (appointment_id);
-- The daily cron sweep queries unsent, due reminders — keep that index tiny.
create index reminders_due_unsent_idx on public.reminders (send_at) where sent = false;

alter table public.reminders enable row level security;
create policy "reminders: owner select" on public.reminders for select to authenticated using ((select auth.uid()) = user_id);
create policy "reminders: owner insert" on public.reminders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reminders: owner update" on public.reminders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reminders: owner delete" on public.reminders for delete to authenticated using ((select auth.uid()) = user_id);
