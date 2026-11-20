begin;
-- Match the existing customer CMS resolver: reviewed locale, reviewed English,
-- then the application-owned fallback. Unfinished Creole remains unpublished.
create or replace function public.goodies_notification_text(p_key text,p_fallback text,p_user_id uuid,p_vars jsonb default '{}'::jsonb)
returns text language plpgsql stable security definer set search_path='' as $localized$
declare v_language text;v_locale text;v_payload jsonb;v_translations jsonb;v_text jsonb;v_english jsonb;v_result text;v_var record;
begin
  select lower(trim(s.language)) into v_language from public.user_settings s where s.user_id=p_user_id;
  v_locale:=case v_language when 'fr' then 'fr' when 'français' then 'fr' when 'ht' then 'ht' when 'kreyòl ayisyen' then 'ht'
    when 'es' then 'es' when 'español' then 'es' when 'zh-hans' then 'zh-Hans' when '简体中文' then 'zh-Hans' else 'en' end;
  select c.payload into v_payload from public.wantiss_cms_content c where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    order by c.version desc limit 1;
  if jsonb_typeof(v_payload->'labels')='array' then
    select entry->'t' into v_translations from jsonb_array_elements(v_payload->'labels') entry where entry->>'id'=p_key limit 1;
  end if;
  v_text:=v_translations->v_locale;
  v_english:=v_translations->'en';
  v_result:=case
    when v_text->>'s'='reviewed' and nullif(trim(v_text->>'v'),'') is not null then v_text->>'v'
    when v_english->>'s'='reviewed' and nullif(trim(v_english->>'v'),'') is not null then v_english->>'v'
    else p_fallback end;
  if jsonb_typeof(p_vars)='object' then
    for v_var in select * from jsonb_each_text(p_vars) loop
      v_result:=replace(v_result,'{'||v_var.key||'}',coalesce(v_var.value,''));
    end loop;
  end if;
  return v_result;
end $localized$;
revoke all on function public.goodies_notification_text(text,text,uuid,jsonb) from public,anon,authenticated;
commit;
