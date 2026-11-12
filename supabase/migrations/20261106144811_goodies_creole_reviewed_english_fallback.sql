begin;
-- Forward change: preserve the existing critical-text guard and publisher ACLs.
do $$
begin
 if not exists(select 1 from pg_trigger where tgname='goodies_content_publication_review_guard'
   and tgrelid='public.wantiss_cms_content'::regclass and not tgisinternal and tgenabled<>'D') then
  raise exception 'Deploy the base Goodies content publication review guard first' using errcode='55000';
 end if;
end $$;
create or replace function private.goodies_assert_reviewed_text(p_text jsonb)
returns void language plpgsql set search_path='' as $$
declare v_locale text;v_translation jsonb;
begin
 if p_text is null or jsonb_typeof(p_text)<>'object' then return;end if;
 for v_locale,v_translation in select key,value from jsonb_each(p_text) loop
  if v_locale='ht' and v_translation->>'s' is distinct from 'reviewed' then
   if jsonb_typeof(p_text->'en'->'v') is distinct from 'string'
      or nullif(trim(p_text->'en'->>'v'),'') is null
      or p_text->'en'->>'s' is distinct from 'reviewed' then
    raise exception 'Review English before using it as the Haitian Creole fallback' using errcode='22023';
   end if;
   -- The customer resolver never serves this unfinished Creole entry.
   -- Keep the original value/status so the super admin can finish it later.
   continue;
  end if;
  if nullif(trim(v_translation->>'v'),'') is not null
    and v_translation->>'s' is distinct from 'reviewed'
    and (v_locale<>'en' or v_translation ? 's') then
   raise exception 'Review critical Goodies translations before publishing' using errcode='22023';
  end if;
 end loop;
end $$;
revoke all on function private.goodies_assert_reviewed_text(jsonb) from public,anon,authenticated;
commit;
