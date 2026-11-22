begin;
-- Pausing private uploads must never reopen public delivery-evidence writes.
-- Other listing assets and authorized reads of historical evidence are unchanged.
alter policy "Goodies legacy proof upload rollout guard" on storage.objects to public
  with check(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%');
alter policy "Goodies legacy proof update rollout guard" on storage.objects to public
  using(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%')
  with check(bucket_id<>'listing-photos' or name not like '%/delivery-proofs/%');

do $private_only$
declare definition text;
  previous text:=$old$if public.goodies_private_delivery_proof_uploads_enabled() then
      raise exception 'Update Wantiss to submit private delivery photos' using errcode='22023';
    end if;$old$;
  replacement text:=$new$raise exception 'Private delivery photos are required' using errcode='22023';$new$;
begin
  select pg_get_functiondef('public.goodies_self_delivery_mark_delivered(uuid,text)'::regprocedure) into definition;
  if position(previous in definition)>0 then
    execute replace(definition,previous,replacement);
  elsif position(replacement in definition)=0 then
    raise exception 'Delivery proof contract changed; review before deploying';
  end if;
end $private_only$;
commit;
