-- Keep Goodies financial policy outside ordinary CMS content editing.
-- The dedicated fee-policy RPC remains the only staff-facing way to change payload.fees.

create or replace function public.wantiss_admin_upsert_cms_version(
  p_content_key text,
  p_locale text,
  p_payload jsonb,
  p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_version integer;
  v_actor uuid := (select auth.uid());
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_fees jsonb;
begin
  if v_actor is null or not public.wantiss_has_permission('content.manage', 'edit') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_content_key, ''))) not between 1 and 160 then
    raise exception 'Invalid content key';
  end if;
  if p_locale !~ '^[a-z]{2,3}(-[A-Z]{2})?$' then
    raise exception 'Invalid locale';
  end if;
  if p_status <> 'draft' then
    raise exception 'Save drafts here; use the dedicated publish or archive operation';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(trim(p_content_key) || ':' || p_locale, 0));

  if trim(p_content_key) = 'goodies.content' then
    if p_locale = 'en' then
      select c.payload -> 'fees'
        into v_fees
        from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
       order by c.version desc, c.published_at desc nulls last
       limit 1
       for update;
      if v_fees is not null then
        v_payload := jsonb_set(v_payload, '{fees}', v_fees, true);
      else
        v_payload := v_payload - 'fees';
      end if;
    else
      v_payload := v_payload - 'fees';
    end if;
  end if;

  select coalesce(max(c.version), 0) + 1
    into v_version
    from public.wantiss_cms_content c
   where c.content_key = trim(p_content_key)
     and c.locale = p_locale;

  insert into public.wantiss_cms_content(
    content_key, locale, version, payload, status, created_by, updated_by
  )
  values (
    trim(p_content_key), p_locale, v_version, v_payload, 'draft', v_actor, v_actor
  )
  returning id into v_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, after_state
  )
  values (
    v_actor, 'cms_draft_created', 'cms_content', v_id::text, 'draft',
    jsonb_build_object('content_key', trim(p_content_key), 'locale', p_locale, 'version', v_version)
  );

  return v_id;
end;
$$;

create or replace function public.wantiss_admin_publish_cms_version(p_content_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_content_key text;
  v_locale text;
  v_row public.wantiss_cms_content%rowtype;
  v_fees jsonb;
begin
  if v_actor is null or not public.wantiss_has_permission('content.publish', 'manage') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select c.content_key, c.locale
    into v_content_key, v_locale
    from public.wantiss_cms_content c
   where c.id = p_content_id;
  if not found then
    raise exception 'Draft content not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_content_key || ':' || v_locale, 0));

  select *
    into v_row
    from public.wantiss_cms_content c
   where c.id = p_content_id
     and c.status = 'draft'
   for update;
  if not found then
    raise exception 'Draft content not found';
  end if;

  if v_content_key = 'goodies.content' then
    if v_locale = 'en' then
      select c.payload -> 'fees'
        into v_fees
        from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
       order by c.version desc, c.published_at desc nulls last
       limit 1
       for update;

      if v_fees is not null then
        v_row.payload := jsonb_set(v_row.payload, '{fees}', v_fees, true);
      else
        v_row.payload := v_row.payload - 'fees';
      end if;
    else
      -- Financial policy is global and sourced only from the English record.
      v_row.payload := v_row.payload - 'fees';
    end if;
  end if;

  update public.wantiss_cms_content
     set status = 'archived', updated_by = v_actor, updated_at = now()
   where content_key = v_row.content_key
     and locale = v_row.locale
     and status = 'published';

  update public.wantiss_cms_content
     set payload = v_row.payload,
         status = 'published',
         published_by = v_actor,
         published_at = now(),
         updated_by = v_actor,
         updated_at = now()
   where id = p_content_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, after_state
  )
  values (
    v_actor, 'cms_content_published', 'cms_content', p_content_id::text, 'publish',
    jsonb_build_object('content_key', v_row.content_key, 'locale', v_row.locale, 'version', v_row.version)
  );
end;
$$;

-- Draft creation is exposed through the permission-checked wrapper only.
revoke all on function public.wantiss_admin_upsert_cms_version(text, text, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.wantiss_admin_publish_cms_version(uuid)
  from public, anon;
grant execute on function public.wantiss_admin_save_cms_draft(text, text, jsonb)
  to authenticated;
grant execute on function public.wantiss_admin_publish_cms_version(uuid)
  to authenticated;
