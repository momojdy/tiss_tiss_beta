create or replace function public.wantiss_admin_upsert_cms_version(p_content_key text,p_locale text,p_payload jsonb,p_status text default 'draft')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_version integer; v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not public.wantiss_has_permission('content.manage','edit') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_status <> 'draft' then raise exception 'Save drafts here; use the dedicated publish or archive operation'; end if;
  if length(trim(coalesce(p_content_key,''))) not between 1 and 160 then raise exception 'Invalid content key'; end if;
  if p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then raise exception 'Invalid locale'; end if;
  perform pg_advisory_xact_lock(hashtextextended(trim(p_content_key)||':'||p_locale,0));
  select coalesce(max(version),0)+1 into v_version from public.wantiss_cms_content where content_key=trim(p_content_key) and locale=p_locale;
  insert into public.wantiss_cms_content(content_key,locale,version,payload,status,created_by,updated_by)
  values(trim(p_content_key),p_locale,v_version,coalesce(p_payload,'{}'::jsonb),'draft',v_actor,v_actor)
  returning id into v_id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values(v_actor,'cms_draft_created','cms_content',v_id::text,'draft',jsonb_build_object('content_key',p_content_key,'locale',p_locale,'version',v_version));
  return v_id;
end;
$$;