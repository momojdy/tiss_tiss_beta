alter table public.goodies_store_schedules
  add column if not exists store_latitude double precision,
  add column if not exists store_longitude double precision;
alter table public.goodies_store_schedules
  drop constraint if exists goodies_store_schedules_store_latitude_range,
  drop constraint if exists goodies_store_schedules_store_longitude_range;
alter table public.goodies_store_schedules
  add constraint goodies_store_schedules_store_latitude_range
    check (store_latitude is null or store_latitude between -90 and 90),
  add constraint goodies_store_schedules_store_longitude_range
    check (store_longitude is null or store_longitude between -180 and 180);

alter table public.wantiss_cms_assets
  add column if not exists public_storage_path text,
  add column if not exists public_source_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wantiss-public-assets',
  'wantiss-public-assets',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;