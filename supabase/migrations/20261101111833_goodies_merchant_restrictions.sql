create or replace function private.goodies_merchant_can_operate(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin'))
  and not exists (select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=(select auth.uid()) and r.scope in ('all','GoodiesMerchant') and r.status='active' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now()));
$function$;

create or replace function public.goodies_save_store_setup(p_business uuid,p_category text,p_kind text,p_min_order numeric,p_delivery_fee numeric,p_eta_min integer,p_eta_max integer,p_promo text,p_names jsonb,p_delivery boolean,p_pickup boolean)
returns void language plpgsql security definer set search_path='public','pg_temp' as $function$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if not private.goodies_merchant_can_operate(p_business) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
 if p_category is null or p_category not in ('restaurants','produce','beverages','bakery','meat','groceries','haitian','care','drugstore') then raise exception 'Choose a store category' using errcode='22023'; end if;
 if p_min_order is null or p_min_order<0 or p_min_order>100000 or p_delivery_fee is null or p_delivery_fee<0 or p_delivery_fee>10000 then raise exception 'Invalid minimum order or delivery fee' using errcode='22023'; end if;
 if p_eta_min is null or p_eta_max is null or p_eta_min<1 or p_eta_max<p_eta_min or p_eta_max>1440 then raise exception 'Invalid delivery time range' using errcode='22023'; end if;
 if not(coalesce(p_delivery,false) or coalesce(p_pickup,false)) then raise exception 'Keep delivery or pickup on' using errcode='22023'; end if;
 if p_promo is not null and p_promo~*'(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)' then raise exception 'Alcohol ads and promotions are prohibited on Wantiss' using errcode='P0001'; end if;
 if p_names is null or jsonb_typeof(p_names)<>'object' then p_names:='{}'::jsonb; end if;
 update public.businesses b set delivery_modes=array_remove(array[case when coalesce(p_delivery,false) then 'Delivery' end,case when coalesce(p_pickup,false) then 'Pickup' end],null) where b.id=p_business;
 insert into public.goodies_store_schedules(business_id,store_id,category,kind,min_order,delivery_fee,eta_min,eta_max,promo,names,is_live) values(p_business,p_business::text,p_category,left(nullif(trim(p_kind),''),80),p_min_order,p_delivery_fee,p_eta_min,p_eta_max,left(nullif(trim(p_promo),''),120),p_names,false)
 on conflict(business_id) do update set category=excluded.category,kind=excluded.kind,min_order=excluded.min_order,delivery_fee=excluded.delivery_fee,eta_min=excluded.eta_min,eta_max=excluded.eta_max,promo=excluded.promo,names=excluded.names,updated_at=now();
 perform public.goodies_sync_store_from_business(p_business);
end;$function$;

create or replace function public.goodies_set_store_live(p_business uuid,p_live boolean)
returns boolean language plpgsql security definer set search_path='public','pg_temp' as $function$
declare v_uid uuid:=auth.uid(); b public.businesses%rowtype; s public.goodies_store_schedules%rowtype;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 if not private.goodies_merchant_can_operate(p_business) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
 select * into s from public.goodies_store_schedules where business_id=p_business for update;
 if not found then raise exception 'Save your store setup first' using errcode='P0001'; end if;
 if not coalesce(p_live,false) then update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business; return false; end if;
 select * into b from public.businesses where id=p_business;
 if not found then raise exception 'Business not found' using errcode='P0002'; end if;
 if s.category is null then raise exception 'Choose a store category first' using errcode='P0001'; end if;
 if b.hours is null or jsonb_typeof(b.hours)<>'object' or b.hours='{}'::jsonb then raise exception 'Set your opening hours in Business information first' using errcode='P0001'; end if;
 if not exists(select 1 from public.goodies_products p where p.business_id=p_business and p.is_available and p.stock>0 and p.restriction<>'alcohol' and not(concat_ws(' ',p.name,p.description)~*'(alcohol|alcool|liquor|rhum|clairin|barbancourt|whisk|vodka|tequila|cognac|brandy|\\mbeer|bi[èe]re|\\mwine|champagne|cocktail)')) then raise exception 'Add at least one available product with stock first' using errcode='P0001'; end if;
 perform public.goodies_sync_store_from_business(p_business);
 update public.goodies_store_schedules set is_live=true,updated_at=now() where business_id=p_business;
 return true;
end;$function$;

create or replace function public.goodies_admin_set_merchant_status(p_business_id uuid,p_live boolean)
returns void language plpgsql security definer set search_path='public','pg_temp' as $function$
begin
 perform public.goodies_admin_assert();
 if not exists(select 1 from public.businesses where id=p_business_id) then raise exception 'Merchant not found' using errcode='P0002'; end if;
 if coalesce(p_live,false) and exists(select 1 from public.business_members bm join public.wantiss_admin_account_restrictions r on r.target_user_id=bm.user_id where bm.business_id=p_business_id and bm.role in ('owner','admin') and r.scope in ('all','GoodiesMerchant') and r.status='active' and r.starts_at<=now() and (r.ends_at is null or r.ends_at>now())) then raise exception 'Goodies merchant access is restricted' using errcode='42501'; end if;
 update public.goodies_store_schedules set is_live=coalesce(p_live,false),updated_at=now() where business_id=p_business_id;
 update public.businesses set is_live=coalesce(p_live,false) where id=p_business_id;
end;$function$;

create or replace function public.wantiss_admin_apply_account_restriction(p_user_id uuid,p_kind text,p_scope text,p_reason text,p_notes text,p_starts_at timestamptz,p_ends_at timestamptz,p_notify_user boolean default false)
returns uuid language plpgsql security definer set search_path='' as $function$
declare v_id uuid; v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or not public.wantiss_has_permission('accounts.restrict','manage') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_kind not in('Suspension','Ban') or length(trim(coalesce(p_scope,''))) not between 1 and 160 or length(trim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Invalid restriction'; end if;
 if p_starts_at is null or(p_ends_at is not null and p_ends_at<p_starts_at) then raise exception 'Invalid restriction dates'; end if;
 if p_user_id=v_actor then raise exception 'You cannot restrict your own account'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found'; end if;
 if p_kind='Ban' and not exists(select 1 from public.wantiss_admin_staff where user_id=v_actor and role='super_admin' and status='active') then raise exception 'Only a Super Admin may ban accounts' using errcode='42501'; end if;
 if exists(select 1 from public.wantiss_admin_account_restrictions r where r.target_user_id=p_user_id and r.status='active' and(r.ends_at is null or r.ends_at>now()) and((r.kind='Ban' and(r.scope='all' or r.scope=p_scope)) or(p_kind='Ban' and(r.scope='all' or r.scope=p_scope)))) then raise exception 'An active restriction already covers this scope'; end if;
 if p_kind='Ban' then update public.wantiss_admin_account_restrictions set status='lifted',lifted_by=v_actor,lifted_at=now(),lift_reason='Superseded by a ban' where target_user_id=p_user_id and status='active' and kind='Suspension' and(scope=p_scope or p_scope='all'); end if;
 insert into public.wantiss_admin_account_restrictions(target_user_id,kind,scope,reason,notes,starts_at,ends_at,created_by,notify_user) values(p_user_id,p_kind,p_scope,trim(p_reason),left(coalesce(p_notes,''),4000),p_starts_at,p_ends_at,v_actor,coalesce(p_notify_user,false)) returning id into v_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state) values(v_actor,'account_restriction_applied','account_restriction',v_id::text,trim(p_reason),jsonb_build_object('target_user_id',p_user_id,'kind',p_kind,'scope',p_scope,'starts_at',p_starts_at,'ends_at',p_ends_at,'notify_user',p_notify_user));
 if p_scope='GoodiesMerchant' then
   update public.goodies_store_schedules s set is_live=false,updated_at=now() where exists(select 1 from public.business_members bm where bm.business_id=s.business_id and bm.user_id=p_user_id and bm.role in('owner','admin'));
   update public.businesses b set is_live=false where exists(select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=p_user_id and bm.role in('owner','admin'));
 end if;
 return v_id;
end;$function$;