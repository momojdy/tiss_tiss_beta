-- Restore the public listing image bucket used by Business Space and Goodies.
-- Images are public to read; only owner/admin members of the first path business may write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business members upload listing photos" on storage.objects;
create policy "Business members upload listing photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  )
);

drop policy if exists "Business members update listing photos" on storage.objects;
create policy "Business members update listing photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  )
)
with check (
  bucket_id = 'listing-photos'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  )
);

drop policy if exists "Business members delete listing photos" on storage.objects;
create policy "Business members delete listing photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin')
  )
);
