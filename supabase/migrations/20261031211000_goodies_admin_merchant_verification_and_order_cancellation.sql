create or replace function public.goodies_admin_set_merchant_verification(p_business_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 if p_status not in ('pending','verified','rejected') then raise exception 'Invalid merchant verification status' using errcode='22023';end if;
 update public.businesses set verification=p_status,is_live=case when p_status='verified' then is_live else false end where id=p_business_id;
 if not found then raise exception 'Merchant not found' using errcode='P0002';end if;
 if p_status<>'verified' then update public.goodies_store_schedules set is_live=false,updated_at=now() where business_id=p_business_id;end if;
end $$;
create or replace function public.goodies_admin_cancel_order(p_order_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_o public.goodies_orders%rowtype;v_item record;v_refunded boolean:=false;
begin
 perform public.goodies_admin_assert();select * into v_o from public.goodies_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found' using errcode='P0002';end if;
 if v_o.status in ('completed','cancelled','declined','expired') then raise exception 'This order is already in a terminal state' using errcode='P0001';end if;
 update public.goodies_orders set status='cancelled',decline_reason_public=coalesce(nullif(left(trim(p_reason),300),''),'The order was cancelled by Wantiss support.'),updated_at=now() where id=p_order_id;
 for v_item in select (e->>'id')::uuid product_id,sum((e->>'q')::integer) qty from jsonb_array_elements(v_o.items) e where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
  update public.goodies_products set stock=least(stock+v_item.qty,100000),updated_at=now() where id=v_item.product_id and business_id=v_o.business_id;
 end loop;
 update public.goodies_delivery_assignments set status='cancelled',updated_at=now() where order_id=p_order_id and status not in ('delivered','declined','cancelled');
 if v_o.payment_method='card' and v_o.payment_status='paid' then update public.goodies_orders set payment_status='refund_pending' where id=p_order_id;end if;
 if v_o.payment_method='wallet' then v_refunded:=public.refund_goodies_wallet_order(p_order_id,'admin_cancelled');end if;
 perform public.goodies_order_notify(v_o.customer_id,'Goodies order cancelled','Order '||v_o.order_code||' was cancelled by Wantiss support.'||case when v_refunded then ' Your Wantiss Wallet refund has been processed.' when v_o.payment_method='card' and v_o.payment_status='paid' then ' Your card refund is being processed.' else '' end,v_o.id,v_o.order_code,'cancelled','admin_cancelled');
end $$;
revoke all on function public.goodies_admin_set_merchant_verification(uuid,text) from public,anon;
revoke all on function public.goodies_admin_cancel_order(uuid,text) from public,anon;
grant execute on function public.goodies_admin_set_merchant_verification(uuid,text) to authenticated;
grant execute on function public.goodies_admin_cancel_order(uuid,text) to authenticated;
create or replace function public.goodies_admin_review_product(p_product_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.goodies_admin_assert();
 if p_status not in ('approved','rejected') then raise exception 'Invalid product review status' using errcode='22023';end if;
 update public.goodies_products set review_status=p_status,review_note=left(nullif(trim(p_note),''),500),reviewed_by=auth.uid(),reviewed_at=now(),is_available=(p_status='approved'),updated_at=now() where id=p_product_id;
 if not found then raise exception 'Product not found' using errcode='P0002';end if;
end $$;
