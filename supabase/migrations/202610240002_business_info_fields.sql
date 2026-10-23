-- Business Space profile form persists these fields. The original compatibility
-- table only had the minimum identity fields, so saves otherwise fail on missing columns.
alter table public.businesses
  add column if not exists description text,
  add column if not exists phone text,
  add column if not exists phone_country text not null default 'HT',
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists country text not null default 'HT',
  add column if not exists delivery_modes text[] not null default '{}'::text[],
  add column if not exists hours jsonb not null default '{}'::jsonb,
  add column if not exists logo_url text;
