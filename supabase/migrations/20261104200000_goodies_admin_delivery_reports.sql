-- Admin review of own-driver delivery reports.
create or replace function public.goodies_admin_list_delivery_reports()
returns table(order_id uuid, order_code text, store_name text, customer_name text, customer_phone text, total numeric,
  payment_method text, payment_status text, driver_name text, driver_phone text, proof_url text, reason text,
  delivered_at timestamptz, opened_at timestamptz, report_status text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.goodies_admin_assert();
  return query
    select o.id, o.order_code, coalesce(b.name, o.store_id), coalesce(nullif(trim(p.full_name), ''), 'Customer'), coalesce(o.contact_phone, p.phone_number),
           o.total, o.payment_method, o.payment_status, o.self_driver_name, o.self_driver_phone, o.delivery_proof_url,
           o.delivery_dispute_reason, o.vendor_delivered_at, o.delivery_dispute_opened_at, o.delivery_dispute_status
    from public.goodies_orders o
    left join public.businesses b on b.id = o.business_id
    left join public.profiles p on p.id = o.customer_id
    where o.delivery_dispute_status is not null
    order by (o.delivery_dispute_status = 'open') desc, o.delivery_dispute_opened_at desc
    limit 100;
end $$;

create or replace function public.goodies_admin_resolve_delivery_dispute(p_order_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_o public.goodies_orders%rowtype; v_refunded boolean := false;
begin
  perform public.goodies_admin_assert();
  if p_resolution not in ('release','refund') then raise exception 'Invalid resolution' using errcode='P0001'; end if;
  select * into v_o from public.goodies_orders where id = p_order_id for update;
  if not found or v_o.delivery_dispute_status is distinct from 'open' then raise exception 'No open report for this order' using errcode='P0002'; end if;
  if p_resolution = 'release' then
    update public.goodies_orders set status = 'completed', delivered_at = coalesce(vendor_delivered_at, now()), delivery_dispute_status = 'resolved_release', updated_at = now() where id = p_order_id;
  else
    update public.goodies_orders set status = 'cancelled', cancelled_at = now(), delivery_dispute_status = 'resolved_refund', updated_at = now() where id = p_order_id;
    if v_o.payment_method = 'card' and v_o.payment_status = 'paid' then update public.goodies_orders set payment_status = 'refund_pending' where id = p_order_id; end if;
    if v_o.payment_method = 'wallet' then v_refunded := public.refund_goodies_wallet_order(p_order_id, 'delivery_dispute'); end if;
  end if;
  perform public.goodies_order_notify(v_o.customer_id, 'Your report was reviewed',
    case when p_resolution = 'refund' then 'Order ' || v_o.order_code || ' was refunded.' || case when v_o.payment_method = 'card' and v_o.payment_status = 'paid' then ' Your card refund is being processed.' else '' end
         else 'Order ' || v_o.order_code || ' was confirmed as delivered.' end,
    v_o.id, v_o.order_code, case when p_resolution = 'refund' then 'cancelled' else 'completed' end, null);
end $$;

revoke all on function public.goodies_admin_list_delivery_reports(), public.goodies_admin_resolve_delivery_dispute(uuid,text) from public, anon;
grant execute on function public.goodies_admin_list_delivery_reports(), public.goodies_admin_resolve_delivery_dispute(uuid,text) to authenticated;
