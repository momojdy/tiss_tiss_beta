begin;

-- Restriction admission is independent of fulfillment permissions. Existing
-- orders and refunds remain operable while a merchant's new sales are paused.
create function private.goodies_store_accepts_orders(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b where b.id=p_business and b.verification<>'restricted')
 and not exists(
  select 1 from public.business_members bm
  join public.wantiss_admin_account_restrictions r on r.target_user_id=bm.user_id
  where bm.business_id=p_business and bm.role in ('owner','admin')
   and r.scope in ('all','GoodiesMerchant') and r.status='active' and r.starts_at<=now()
   and (r.ends_at is null or r.ends_at>now())
 )
$$;
revoke all on function private.goodies_store_accepts_orders(uuid) from public;
grant execute on function private.goodies_store_accepts_orders(uuid) to anon,authenticated;

create function private.goodies_assert_store_admission(p_business uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- Serialize a checkout/publication with a business restriction decision.
 perform 1 from public.businesses where id=p_business for share;
 if not found or not private.goodies_store_accepts_orders(p_business) then
  raise exception 'This store is not accepting new orders' using errcode='42501';
 end if;
end $$;
revoke all on function private.goodies_assert_store_admission(uuid) from public,anon,authenticated;

alter policy "Public can read live Goodies schedules" on public.goodies_store_schedules
 using(is_live=true and private.goodies_customer_can_access() and private.goodies_store_accepts_orders(business_id));

do $publish_admission$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('public.goodies_set_store_live(uuid,boolean)'::regprocedure);
 needle:='  select * into s from public.goodies_store_schedules where business_id=p_business for update;';
 if position(needle in definition)=0 then raise exception 'Goodies publication admission contract drift';end if;
 execute replace(definition,needle,
  '  if coalesce(p_live,false) then perform private.goodies_assert_store_admission(p_business);end if;'||E'\n'||needle);
end $publish_admission$;

create function private.goodies_guard_store_publication()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.is_live and (tg_op='INSERT' or not old.is_live or new.business_id is distinct from old.business_id)
    and not private.goodies_store_accepts_orders(new.business_id) then
  raise exception 'This store is not accepting new orders' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.goodies_guard_store_publication() from public,anon,authenticated;
create trigger aa_goodies_store_publication before insert or update of is_live,business_id on public.goodies_store_schedules
 for each row execute function private.goodies_guard_store_publication();

-- All paid checkout wrappers ultimately invoke these canonical validators.
-- Shared Bill's creator-owned finalizer must enforce the same admission rule.
do $checkout_admission$
declare f record;definition text;needle text;matched integer:=0;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname='place_goodies_order')
     or (n.nspname='private' and p.proname='help_pay_place_goodies_order') loop
  definition:=pg_get_functiondef(f.oid);
  needle:='  select * into v_store from public.goodies_store_schedules';
  if position(needle in definition)=0 then raise exception 'Goodies checkout admission contract drift';end if;
  execute replace(definition,needle,
   '  perform private.goodies_assert_store_admission((select business_id from public.goodies_store_schedules where store_id=p_store_id));'||E'\n'||needle);
  matched:=matched+1;
 end loop;
 if matched<>2 then raise exception 'Goodies canonical checkout contracts are incomplete';end if;
end $checkout_admission$;

create function private.goodies_guard_new_order_admission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.goodies_assert_store_admission(new.business_id);
 return new;
end $$;
revoke all on function private.goodies_guard_new_order_admission() from public,anon,authenticated;
create trigger aa_goodies_new_order_admission before insert on public.goodies_orders
 for each row execute function private.goodies_guard_new_order_admission();

-- Routing uses a service client, so give it the same public-store filter rather
-- than duplicating restriction rules in the Edge Function.
create function public.goodies_delivery_eligible_stores(p_store_ids text[])
returns setof text language sql stable security definer set search_path='' as $$
 select s.store_id from public.goodies_store_schedules s
 where cardinality(p_store_ids) between 1 and 8 and s.store_id=any(p_store_ids)
  and s.is_live and private.goodies_store_accepts_orders(s.business_id)
$$;
revoke all on function public.goodies_delivery_eligible_stores(text[]) from public,anon,authenticated;
grant execute on function public.goodies_delivery_eligible_stores(text[]) to service_role;

commit;
