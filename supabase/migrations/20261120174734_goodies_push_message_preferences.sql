begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
-- Match the existing inbox filter: order preferences govern order notices;
-- customer store messages retain their own notification lifecycle.
create or replace function private.goodies_push_allowed(n public.notifications)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare prefs jsonb;bid uuid;
begin
 if n.user_id is null or lower(coalesce(n.feature_name,''))<>'goodies' or n.notification_type like 'goodies_admin_%' or coalesce(n.destination,'') like 'admin%' then return false;end if;
 select notification_preferences into prefs from public.user_settings where user_id=n.user_id;
 if n.destination='goodies_courier' or n.notification_type like 'goodies_courier_%' then
  return exists(select 1 from public.goodies_courier_roster where courier_id=n.user_id and is_approved);
 end if;
 if coalesce(n.destination,'') like 'business_%' or n.notification_type like 'goodies_vendor_%' or n.notification_type like 'goodies_ingredient_%' or (n.notification_type='store_message' and n.metadata ? 'business_id') then
  if coalesce(prefs->'goodies_vendor_push','true'::jsonb)='false'::jsonb then return false;end if;
  if coalesce(n.metadata->>'business_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false;end if;
  bid:=(n.metadata->>'business_id')::uuid;
  return exists(select 1 from public.business_members where user_id=n.user_id and business_id=bid);
 end if;
 if n.notification_type in ('goodies_promo','goodies_promotion') then
  return coalesce(prefs->'goodies_promos',prefs->'promotions','true'::jsonb)<>'false'::jsonb;
 end if;
 if n.notification_type in ('goodies_order','goodies_customer_order') then
  return coalesce(prefs->'goodies_orders',prefs->'orders','true'::jsonb)<>'false'::jsonb;
 end if;
 return true;
end $$;
revoke all on function private.goodies_push_allowed(public.notifications) from public,anon,authenticated;
commit;
