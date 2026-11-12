-- Read the existing Wantiss account preference and the existing published CMS.
-- Critical notification text is used only when its locale is marked reviewed.
begin;
create or replace function public.goodies_notification_text(p_key text,p_fallback text,p_user_id uuid,p_vars jsonb default '{}'::jsonb)
returns text language plpgsql stable security definer set search_path='' as $localized$
declare v_language text;v_locale text;v_payload jsonb;v_text jsonb;v_result text;v_var record;
begin
  select lower(trim(s.language)) into v_language from public.user_settings s where s.user_id=p_user_id;
  v_locale:=case v_language when 'fr' then 'fr' when 'français' then 'fr' when 'ht' then 'ht' when 'kreyòl ayisyen' then 'ht'
    when 'es' then 'es' when 'español' then 'es' when 'zh-hans' then 'zh-Hans' when '简体中文' then 'zh-Hans' else 'en' end;
  select c.payload into v_payload from public.wantiss_cms_content c where c.content_key='goodies.content' and c.locale='en' and c.status='published'
    order by c.version desc limit 1;
  if jsonb_typeof(v_payload->'labels')='array' then
    select entry->'t'->v_locale into v_text from jsonb_array_elements(v_payload->'labels') entry where entry->>'id'=p_key limit 1;
  end if;
  v_result:=case when v_text->>'s'='reviewed' and nullif(trim(v_text->>'v'),'') is not null then v_text->>'v' else p_fallback end;
  if jsonb_typeof(p_vars)='object' then
    for v_var in select * from jsonb_each_text(p_vars) loop
      v_result:=replace(v_result,'{'||v_var.key||'}',coalesce(v_var.value,''));
    end loop;
  end if;
  return v_result;
end $localized$;
revoke all on function public.goodies_notification_text(text,text,uuid,jsonb) from public,anon,authenticated;

create or replace function private.goodies_localize_notification()
returns trigger language plpgsql security definer set search_path='' as $localized$
declare v_event text;v_vars jsonb;
begin
  if lower(coalesce(new.feature_name,''))<>'goodies' then return new;end if;
  v_event:=case new.title
    when 'Goodies order placed' then 'orderPlaced'
    when 'Goodies order scheduled' then 'orderScheduled'
    when 'Goodies order accepted' then 'orderAccepted'
    when 'Store is preparing your Goodies order' then 'orderPreparing'
    when 'Goodies order is ready' then 'orderReady'
    when 'Goodies order completed' then 'orderCompleted'
    when 'Goodies order cancelled' then 'orderCancelled'
    when 'Goodies order expired' then 'orderExpired'
    when 'Store declined your Goodies order' then 'orderDeclined'
    when 'Restaurant cancelled your Goodies order' then 'restaurantCancelled'
    when 'Goodies card verification expired' then 'cardVerificationExpired'
    when 'Goodies payment failed' then 'paymentFailed'
    when 'New Goodies order' then 'newVendorOrder'
    when 'Scheduled Goodies order is due' then 'scheduledOrderDue'
    when 'Your order is on its way' then 'ownDriverOnWay'
    when 'Did you receive your order?' then 'receiptConfirmation'
    when 'Your report was reviewed' then 'disputeResolution'
    when 'Delivery reported' then 'deliveryReported'
    when 'Courier accepted your order' then 'courierAccepted'
    when 'Courier declined the offer' then 'courierDeclined'
    when 'Courier offer expired' then 'courierExpired'
    when 'Courier offer sent' then 'courierOffered'
    else nullif(regexp_replace(coalesce(new.notification_type,''),'[^a-zA-Z0-9_]','','g'),'') end;
  if v_event is null then return new;end if;
  v_vars:=coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('details',new.body);
  new.title:=public.goodies_notification_text('lbl.notification.'||v_event||'.title',new.title,new.user_id,v_vars);
  new.body:=public.goodies_notification_text('lbl.notification.'||v_event||'.body',new.body,new.user_id,v_vars);
  return new;
end $localized$;
revoke all on function private.goodies_localize_notification() from public,anon,authenticated;
create trigger goodies_localize_notification before insert on public.notifications for each row execute function private.goodies_localize_notification();
commit;
