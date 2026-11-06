-- Roll out private evidence only after compatible viewers are deployed. The
-- existing protected Goodies settings remain the single configuration source.
begin;
create or replace function public.goodies_private_delivery_proof_uploads_enabled()
returns boolean language sql stable security definer set search_path='' as $flag$
  select coalesce((select c.payload->'fees'->>'privateDeliveryProofs'='true'
    from public.wantiss_cms_content c where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    order by c.version desc limit 1),false);
$flag$;
revoke all on function public.goodies_private_delivery_proof_uploads_enabled() from public,anon;
grant execute on function public.goodies_private_delivery_proof_uploads_enabled() to authenticated;

create or replace function public.goodies_admin_set_private_delivery_proofs(p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $flag$
declare v_content public.wantiss_cms_content%rowtype;v_before boolean;
begin
  perform public.goodies_admin_assert();
  if p_enabled is null then raise exception 'Choose a delivery-evidence rollout state' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('goodies.content:en',0));
  select * into v_content from public.wantiss_cms_content c where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    order by c.version desc limit 1 for update;
  if not found then raise exception 'Published Goodies configuration is unavailable' using errcode='P0002';end if;
  v_before:=coalesce(v_content.payload->'fees'->>'privateDeliveryProofs'='true',false);
  if v_before=p_enabled then return;end if;
  update public.wantiss_cms_content set payload=jsonb_set(v_content.payload,'{fees}',coalesce(v_content.payload->'fees','{}'::jsonb)||jsonb_build_object('privateDeliveryProofs',p_enabled),true),
    updated_by=auth.uid(),updated_at=now() where id=v_content.id;
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
    values(auth.uid(),'goodies_private_delivery_proofs_rollout','cms_content',v_content.id::text,'Delivery-evidence client compatibility rollout',
      jsonb_build_object('enabled',v_before),jsonb_build_object('enabled',p_enabled));
end $flag$;
revoke all on function public.goodies_admin_set_private_delivery_proofs(boolean) from public,anon;
grant execute on function public.goodies_admin_set_private_delivery_proofs(boolean) to authenticated;

do $patch$
declare v_definition text;v_old text;
begin
  v_definition:=pg_get_functiondef('private.goodies_can_access_delivery_proof(text,boolean)'::regprocedure);
  v_old:='if p_write then return v_manager and';
  if position(v_old in v_definition)=0 then raise exception 'Delivery-proof access definition changed; review before deploying';end if;
  execute replace(v_definition,v_old,'if p_write then return public.goodies_private_delivery_proof_uploads_enabled() and v_manager and');
  v_definition:=pg_get_functiondef('public.goodies_self_delivery_mark_delivered(uuid,text)'::regprocedure);
  v_old:=$old$v_bucket := 'listing-photos';$old$;
  if position(v_old in v_definition)=0 then raise exception 'Delivery-proof submission definition changed; review before deploying';end if;
  execute replace(v_definition,v_old,v_old||$new$
    if public.goodies_private_delivery_proof_uploads_enabled() then
      raise exception 'Update Wantiss to submit private delivery photos' using errcode='22023';
    end if;$new$);
end $patch$;
create policy "Goodies legacy proof upload rollout guard" on storage.objects as restrictive for insert to authenticated
  with check(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%' or not public.goodies_private_delivery_proof_uploads_enabled());
create policy "Goodies legacy proof update rollout guard" on storage.objects as restrictive for update to authenticated
  using(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%' or not public.goodies_private_delivery_proof_uploads_enabled())
  with check(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%' or not public.goodies_private_delivery_proof_uploads_enabled());
commit;
