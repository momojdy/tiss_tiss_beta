alter table public.goodies_products
 add column if not exists review_status text not null default 'approved',
 add column if not exists review_note text,
 add column if not exists reviewed_by uuid references auth.users(id),
 add column if not exists reviewed_at timestamptz;
alter table public.goodies_products drop constraint if exists goodies_products_review_status_check;
alter table public.goodies_products add constraint goodies_products_review_status_check check(review_status in ('pending','approved','rejected'));
create or replace function public.goodies_products_default_pending_review()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null then new.review_status:='pending';new.review_note:=null;new.reviewed_by:=null;new.reviewed_at:=null;new.is_available:=false;end if;
 return new;
end $$;
drop trigger if exists goodies_products_new_vendor_review on public.goodies_products;
create trigger goodies_products_new_vendor_review before insert on public.goodies_products for each row execute function public.goodies_products_default_pending_review();

create or replace function public.goodies_admin_assert()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','super_admin')) then raise exception 'Goodies administrator access required' using errcode='42501';end if;
end $$;
create or replace function public.goodies_admin_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 perform public.goodies_admin_assert();
 select jsonb_build_object(
 'stats',jsonb_build_object('stores',(select count(*) from public.goodies_store_schedules),'live_stores',(select count(*) from public.goodies_store_schedules where is_live),'products',(select count(*) from public.goodies_products),'pending_products',(select count(*) from public.goodies_products where review_status='pending'),'orders',(select count(*) from public.goodies_orders),'open_orders',(select count(*) from public.goodies_orders where status not in ('completed','cancelled','declined','expired')),'gross_total',(select coalesce(sum(total),0) from public.goodies_orders where payment_status in ('paid','pay_on_receipt'))),
 'merchants',coalesce((select jsonb_agg(jsonb_build_object('business_id',s.business_id,'store_id',s.store_id,'name',coalesce(s.business_name,b.name),'category',s.category,'is_live',s.is_live,'verification',b.verification,'accept_cash_on_delivery',s.accept_cash_on_delivery,'delivery_fee',s.delivery_fee,'delivery_pricing_mode',s.delivery_pricing_mode,'city',s.city,'country',s.country) order by s.updated_at desc) from public.goodies_store_schedules s join public.businesses b on b.id=s.business_id),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'business_id',p.business_id,'store_name',s.business_name,'name',p.name,'description',p.description,'price',p.price,'stock',p.stock,'is_available',p.is_available,'review_status',p.review_status,'review_note',p.review_note,'created_at',p.created_at) order by case p.review_status when 'pending' then 0 else 1 end,p.created_at desc) from public.goodies_products p left join public.goodies_store_schedules s on s.business_id=p.business_id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'order_code',o.order_code,'store_id',o.store_id,'store_name',s.business_name,'customer_id',o.customer_id,'status',o.status,'payment_method',o.payment_method,'payment_status',o.payment_status,'total',o.total,'created_at',o.created_at,'scheduled_for',o.scheduled_for,'courier_id',o.courier_id) order by o.created_at desc) from (select * from public.goodies_orders order by created_at desc limit 150) o left join public.goodies_store_schedules s on s.store_id=o.store_id),'[]'::jsonb)
 ) into result; return result;
end $$;
create or replace function public.goodies_admin_set_merchant_status(p_business_id uuid,p_live boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_verification text;
begin
 perform public.goodies_admin_assert();select verification into v_verification from public.businesses where id=p_business_id for update;
 if not found then raise exception 'Merchant not found' using errcode='P0002';end if;
 if p_live and v_verification<>'verified' then raise exception 'Merchant must be verified before the Goodies store can go live' using errcode='P0001';end if;
 update public.goodies_store_schedules set is_live=coalesce(p_live,false),updated_at=now() where business_id=p_business_id;
 update public.businesses set is_live=coalesce(p_live,false) where id=p_business_id;
end $$;
create or replace function public.goodies_admin_review_product(p_product_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();if p_status not in ('approved','rejected') then raise exception 'Invalid product review status' using errcode='22023';end if;
 update public.goodies_products set review_status=p_status,review_note=left(nullif(trim(p_note),''),500),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_product_id;
 if not found then raise exception 'Product not found' using errcode='P0002';end if;
end $$;
create or replace function public.goodies_admin_update_fee_policy(p_service_fee numeric,p_first_order_free boolean,p_wallet_enabled boolean,p_card_enabled boolean,p_cash_enabled boolean,p_tips numeric[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.wantiss_cms_content%rowtype;v_fees jsonb;
begin
 perform public.goodies_admin_assert();
 if p_service_fee is null or p_service_fee<0 or p_service_fee>1000 then raise exception 'Service fee must be between 0 and 1000' using errcode='22023';end if;
 if exists(select 1 from unnest(coalesce(p_tips,'{}'::numeric[])) t where t<0 or t>1000) then raise exception 'Invalid tip preset' using errcode='22023';end if;
 select * into v_row from public.wantiss_cms_content where content_key='goodies.content' and locale='en' and status='published' order by version desc limit 1 for update;
 if not found then raise exception 'Published Goodies CMS content not found' using errcode='P0002';end if;
 v_fees:=coalesce(v_row.payload->'fees','{}'::jsonb)||jsonb_build_object('svc',p_service_fee,'first',coalesce(p_first_order_free,false),'tips',array_to_string(coalesce(p_tips,'{}'::numeric[]),','),'pay',jsonb_build_object('Wallet',coalesce(p_wallet_enabled,false),'MonCash',false,'Card',coalesce(p_card_enabled,false),'Cash',coalesce(p_cash_enabled,false)));
 update public.wantiss_cms_content set payload=jsonb_set(v_row.payload,'{fees}',v_fees,true),updated_at=now() where id=v_row.id;
end $$;
create or replace function public.goodies_admin_analytics()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 return jsonb_build_object('orders_30d',(select count(*) from public.goodies_orders where created_at>=now()-interval '30 days'),'gross_30d',(select coalesce(sum(total),0) from public.goodies_orders where created_at>=now()-interval '30 days' and payment_status in ('paid','pay_on_receipt')),'average_order',(select coalesce(avg(total),0) from public.goodies_orders where created_at>=now()-interval '30 days'),'by_status',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.goodies_orders where created_at>=now()-interval '30 days' group by status) x),'by_payment',(select coalesce(jsonb_object_agg(payment_method,n),'{}'::jsonb) from (select payment_method,count(*) n from public.goodies_orders where created_at>=now()-interval '30 days' group by payment_method) x),'top_stores',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select store_id,count(*) orders,sum(total) gross from public.goodies_orders where created_at>=now()-interval '30 days' group by store_id order by count(*) desc limit 10) x));
end $$;
revoke all on function public.goodies_admin_assert() from public,anon,authenticated;
revoke all on function public.goodies_admin_dashboard() from public,anon;
revoke all on function public.goodies_admin_set_merchant_status(uuid,boolean) from public,anon;
revoke all on function public.goodies_admin_review_product(uuid,text,text) from public,anon;
revoke all on function public.goodies_admin_update_fee_policy(numeric,boolean,boolean,boolean,boolean,numeric[]) from public,anon;
revoke all on function public.goodies_admin_analytics() from public,anon;
grant execute on function public.goodies_admin_dashboard() to authenticated;
grant execute on function public.goodies_admin_set_merchant_status(uuid,boolean) to authenticated;
grant execute on function public.goodies_admin_review_product(uuid,text,text) to authenticated;
grant execute on function public.goodies_admin_update_fee_policy(numeric,boolean,boolean,boolean,boolean,numeric[]) to authenticated;
grant execute on function public.goodies_admin_analytics() to authenticated;
