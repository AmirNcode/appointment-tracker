-- Home location on profiles: biases Places autocomplete to the user's city/metro.
-- Nullable + additive; RLS on profiles already scopes reads/writes to the owner.
alter table public.profiles
  add column if not exists home_city text,
  add column if not exists home_lat double precision,
  add column if not exists home_lng double precision;

comment on column public.profiles.home_city is 'User home city label (e.g. "Toronto, ON"); biases Places autocomplete.';
comment on column public.profiles.home_lat is 'Latitude of home city centre, for Places locationBias.';
comment on column public.profiles.home_lng is 'Longitude of home city centre, for Places locationBias.';
