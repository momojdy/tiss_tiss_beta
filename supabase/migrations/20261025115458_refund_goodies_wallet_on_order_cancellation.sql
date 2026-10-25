create or replace function public.set_goodies_order_status(p_order_id uuid,p_status text)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_o public.goodies_orders%rowtype; v_member boolean; v_agg record; v_title text; v_body text; v_refunded boolean:=false;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  select exists(select 1 from public.business_members bm where bm.business_id=v_o.business_id and bm.user_id=v_uid) into v_member;
  if p_status='cancelled' then
    if v_o.customer_id=v_uid and v_o.status in ('scheduled','placed') then null;
    elsif v_member and v_o.status in ('scheduled','placed','accepted','preparing') then null;
    else raise exception 'This order can no longer be cancelled' using errcode='P0001'; end if;
    for v_agg in select (e->>'id')::uuid pid,sum((e->>'q')::int) qty from jsonb_array_elements(v_o.items) e where (e->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and (e->>'q') ~ '^[0-9]+$' group by 1 loop
      update public.goodies_products gp set stock=least(gp.stock+v_agg.qty,100000),updated_at=now() where gp.id=v_agg.pid and gp.business_id=v_o.business_id;
    end loop;
    v_title:='Goodies order cancelled'; v_body:='Order '||v_o.order_code||' was cancelled.';
  else
    if not v_member then raise exception 'Not allowed' using errcode='42501'; end if;
    if not ((v_o.status='accepted' and p_status='preparing') or (v_o.status='preparing' and p_status='ready') or (v_o.status='ready' and p_status='completed')) then raise exception 'Invalid status change from % to %',v_o.status,p_status using errcode='P0001'; end if;
    if v_o.status='accepted' then v_title:='Store is preparing your Goodies order'; v_body:='The store has started preparing order '||v_o.order_code||'.';
    elsif p_status='ready' then v_title:='Goodies order is ready'; v_body:='Order '||v_o.order_code||' is ready for pickup or its next delivery step.';
    else v_title:='Goodies order completed'; v_body:='Order '||v_o.order_code||' has been marked completed.'; end if;
  end if;
  update public.goodies_orders set status=p_status,updated_at=now() where id=p_order_id;
  if p_status='cancelled' then
    v_refunded:=public.refund_goodies_wallet_order(v_o.id,'order_cancelled');
    if v_refunded then v_body:=v_body||' Your payment was refunded to your Wantiss wallet.';
    elsif v_o.payment_method='wallet' and v_o.payment_status='paid' then v_body:=v_body||' Your wallet refund needs manual review.';
    else v_body:=v_body||' You were not charged for this order.'; end if;
  end if;
  perform public.goodies_order_notify(v_o.customer_id,v_title,v_body,v_o.id,v_o.order_code,p_status,null);
  if p_status='cancelled' then for v_agg in select bm.user_id from public.business_members bm where bm.business_id=v_o.business_id loop
    perform public.goodies_order_notify(v_agg.user_id,'Goodies order cancelled','Order '||v_o.order_code||' was cancelled by the customer or store.',v_o.id,v_o.order_code,'cancelled',null);
  end loop; end if;
  return p_status;
end $$;
revoke all on function public.set_goodies_order_status(uuid,text) from public,anon;
grant execute on function public.set_goodies_order_status(uuid,text) to authenticated;
