alter table public.goodies_products
  add column if not exists photo_urls jsonb not null default '[]'::jsonb;

update public.goodies_products
set photo_urls = case
  when photo_url is null or btrim(photo_url) = '' then '[]'::jsonb
  else jsonb_build_array(photo_url)
end
where photo_urls = '[]'::jsonb and photo_url is not null and btrim(photo_url) <> '';

alter table public.goodies_products
  drop constraint if exists goodies_products_photo_urls_limit;

alter table public.goodies_products
  add constraint goodies_products_photo_urls_limit
  check (
    jsonb_typeof(photo_urls) = 'array'
    and jsonb_array_length(photo_urls) <= 5
  );
