-- T1.4 — User profiles (1:1 with auth.users), holding preferences not owned by
-- Supabase Auth. Auto-created on signup via a trigger; RLS restricts to owner.
-- Applied to the remote project (hsjaqjeejcamxztauxbj) via the Supabase MCP.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'America/Toronto',
  email_reminders_opt_in boolean not null default false,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user profile and preferences, 1:1 with auth.users (T1.4).';

-- Row-Level Security: a user can read and update only their own row.
alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT policy: rows are created by the security-definer trigger below.
-- No DELETE policy: profiles are removed via the auth.users cascade.

-- Auto-create a profile row when a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Harden: trigger functions execute regardless of EXECUTE grants, so revoke the
-- default PUBLIC execute to keep this security-definer function from being a
-- callable endpoint for anon/authenticated.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
