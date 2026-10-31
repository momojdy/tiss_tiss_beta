-- Snapshot the Wantiss delivery commission for each new Goodies delivery order.
-- 7% applies only to the delivery fee. Tips, service fees and product amounts are excluded.
-- Existing orders retain a 0% delivery commission; no historical courier earnings are reduced.

alter table public.goodies_orders
  add column if not exists delivery_commission_rate numeric(5,4) not null default 0.07,
  add column if not exists delivery_commission_amount numeric(12,2) not null default 0,
  add column if not exists courier_net_delivery_amount numeric(12,2) not null default 0;

update public.goodies_orders
set delivery_commission_rate = 0,
    delivery_commission_amount = 0,
    courier_net_delivery_amount = round(greatest(coalesce(delivery_fee, 0), 0), 2);

create or replace function public.goodies_set_order_commission_snapshot()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_op = 'INSERT' then
    -- Product commission: 10% of discounted product subtotal.
    new.platform_commission_rate := 0.10;
    new.commissionable_subtotal := round(
      greatest(coalesce(new.subtotal, 0) - coalesce(new.discount, 0), 0),
      2
    );
    new.platform_commission_amount := round(
      new.commissionable_subtotal * new.platform_commission_rate,
      2
    );
    new.vendor_net_amount := round(
      new.commissionable_subtotal - new.platform_commission_amount,
      2
    );

    -- Delivery commission: 7% of delivery fee only.
    new.delivery_commission_rate := 0.07;
    new.delivery_commission_amount := round(
      greatest(coalesce(new.delivery_fee, 0), 0) * new.delivery_commission_rate,
      2
    );
    new.courier_net_delivery_amount := round(
      greatest(coalesce(new.delivery_fee, 0), 0) - new.delivery_commission_amount,
      2
    );
  else
    -- Financial amounts and commission snapshots are immutable after checkout.
    -- Status, fulfilment, courier assignment and payment-state updates remain allowed.
    if new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount
       or new.delivery_fee is distinct from old.delivery_fee
       or new.service_fee is distinct from old.service_fee
       or new.tip is distinct from old.tip
       or new.total is distinct from old.total
       or new.commissionable_subtotal is distinct from old.commissionable_subtotal
       or new.platform_commission_rate is distinct from old.platform_commission_rate
       or new.platform_commission_amount is distinct from old.platform_commission_amount
       or new.vendor_net_amount is distinct from old.vendor_net_amount
       or new.delivery_commission_rate is distinct from old.delivery_commission_rate
       or new.delivery_commission_amount is distinct from old.delivery_commission_amount
       or new.courier_net_delivery_amount is distinct from old.courier_net_delivery_amount then
      raise exception 'Goodies order financial amounts and commission are immutable after checkout'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.goodies_set_order_commission_snapshot() from public, anon, authenticated;
