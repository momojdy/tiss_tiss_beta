-- Admin review of own-driver delivery reports.
-- Hardened version: canonical admin gate, fixed search_path, checked wallet refunds,
-- relies on the existing card-refund triggers, and records every admin decision.

create or replace function public.goodies_admin_list_delivery_reports()
returns table(
  order_id uuid, order_code text, store_name text, customer_name text, customer_phone text,
  total numeric, payment_method text, payment_status text, driver_name text, driver_phone text,
  proof_url text, reason text, delivered_at timestamptz, opened_at timestamptz, report_status text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.goodies_admin_assert();
  return query
    select o.id, o.order_code, coalesce(b.name, o.store_id),
           coalesce(nullif(trim(p.full_name), ''), 'Customer'),
           coalesce(o.contact_phone, p.phone_number),
           o.total, o.payment_method, o.payment_status, o.self_driver_name, o.self_driver_phone,
           o.delivery_proof_url, o.delivery_dispute_reason, o.vendor_delivered_at,
           o.delivery_dispute_opened_at, o.delivery_dispute_status
      from public.goodies_orders as o
      left join public.businesses as b on b.id = o.business_id
      left join public.profiles as p on p.id = o.customer_id
     where o.delivery_dispute_status is not null
     order by (o.delivery_dispute_status = 'open') desc, o.delivery_dispute_opened_at desc
     limit 100;
end
$function$;

create or replace function public.goodies_admin_resolve_delivery_dispute(
  p_order_id uuid,
  p_resolution text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_o public.goodies_orders%rowtype;
  v_refunded boolean := false;
  v_notification_body text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid := auth.uid();
begin
  perform public.goodies_admin_assert();

  if p_resolution is null or p_resolution not in ('release', 'refund') then
    raise exception 'Invalid resolution' using errcode = 'P0001';
  end if;

  select * into v_o
    from public.goodies_orders
   where id = p_order_id
   for update;

  if not found or v_o.delivery_dispute_status is distinct from 'open' then
    raise exception 'No open report for this order' using errcode = 'P0002';
  end if;

  v_before := jsonb_build_object(
    'status', v_o.status,
    'payment_status', v_o.payment_status,
    'delivery_dispute_status', v_o.delivery_dispute_status
  );

  if p_resolution = 'release' then
    update public.goodies_orders
       set status = 'completed',
           delivered_at = coalesce(vendor_delivered_at, now()),
           delivery_dispute_status = 'resolved_release',
           updated_at = now()
     where id = p_order_id;
    v_notification_body := 'Order ' || v_o.order_code || ' was confirmed as delivered.';
  else
    if v_o.payment_method = 'wallet' then
      if v_o.payment_status = 'paid' then
        v_refunded := public.refund_goodies_wallet_order(p_order_id, 'delivery_dispute');
        if not coalesce(v_refunded, false) then
          raise exception 'Wallet refund was not completed; report remains open for review' using errcode = 'P0001';
        end if;
        v_notification_body := 'Order ' || v_o.order_code || ' was refunded to your Wantiss wallet.';
      elsif v_o.payment_status = 'refunded' then
        v_notification_body := 'Order ' || v_o.order_code || ' had already been refunded to your Wantiss wallet.';
      else
        raise exception 'Wallet payment is not in a refundable paid state; report remains open for review' using errcode = 'P0001';
      end if;

      update public.goodies_orders
         set status = 'cancelled',
             cancelled_at = now(),
             delivery_dispute_status = 'resolved_refund',
             updated_at = now()
       where id = p_order_id;

    elsif v_o.payment_method = 'card' then
      if v_o.payment_status in ('paid', 'partially_refunded', 'refund_pending') then
        if nullif(v_o.payment_provider_ref, '') is null then
          update public.goodies_orders
             set status = 'cancelled',
                 cancelled_at = now(),
                 delivery_dispute_status = 'resolved_refund',
                 payment_status = 'refund_manual_review',
                 updated_at = now()
           where id = p_order_id;
        else
          update public.goodies_orders
             set status = 'cancelled',
                 cancelled_at = now(),
                 delivery_dispute_status = 'resolved_refund',
                 updated_at = now()
           where id = p_order_id;
        end if;
        -- Existing terminal-status triggers enqueue card refunds when a provider
        -- reference exists. Without one, the order remains explicitly in manual review.
        v_notification_body := 'You were not charged for this order.';
      elsif v_o.payment_status = 'refunded' then
        update public.goodies_orders
           set status = 'cancelled',
               cancelled_at = now(),
               delivery_dispute_status = 'resolved_refund',
               updated_at = now()
         where id = p_order_id;
        v_notification_body := 'Order ' || v_o.order_code || ' had already been refunded to your card.';
      else
        raise exception 'Card payment is not in a refundable state; report remains open for review' using errcode = 'P0001';
      end if;

    else
      raise exception 'Unsupported payment method; report remains open for manual review' using errcode = 'P0001';
    end if;
  end if;

  perform public.goodies_order_notify(
    v_o.customer_id,
    'Your report was reviewed',
    v_notification_body,
    v_o.id,
    v_o.order_code,
    case when p_resolution = 'refund' then 'cancelled' else 'completed' end,
    null
  );

  select jsonb_build_object(
    'status', o.status,
    'payment_status', o.payment_status,
    'delivery_dispute_status', o.delivery_dispute_status
  ) into v_after
    from public.goodies_orders as o
   where o.id = p_order_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, before_state, after_state
  ) values (
    v_actor,
    case when p_resolution = 'refund' then 'goodies_delivery_report_refunded' else 'goodies_delivery_report_released' end,
    'goodies_order',
    p_order_id::text,
    'Delivery report decision: ' || p_resolution,
    v_before,
    v_after
  );
end
$function$;

revoke all on function public.goodies_admin_list_delivery_reports() from public, anon;
revoke all on function public.goodies_admin_resolve_delivery_dispute(uuid, text) from public, anon;
grant execute on function public.goodies_admin_list_delivery_reports() to authenticated;
grant execute on function public.goodies_admin_resolve_delivery_dispute(uuid, text) to authenticated;
