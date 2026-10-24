create or replace function public.wantiss_cms_published_content(p_locale text default 'en')
returns table(content_key text, locale text, version integer, payload jsonb, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
 select c.content_key,c.locale,c.version,c.payload,c.updated_at
 from public.wantiss_cms_content c
 where c.status='published' and c.locale=p_locale
   and c.version=(select max(c2.version) from public.wantiss_cms_content c2 where c2.content_key=c.content_key and c2.locale=c.locale and c2.status='published')
   and not exists (
     select 1 from public.wantiss_cms_content archived
     where archived.content_key=c.content_key and archived.locale=c.locale
       and archived.status='archived' and archived.version>c.version
   )
 order by c.content_key
$$;
revoke all on function public.wantiss_cms_published_content(text) from public;
grant execute on function public.wantiss_cms_published_content(text) to anon,authenticated;
