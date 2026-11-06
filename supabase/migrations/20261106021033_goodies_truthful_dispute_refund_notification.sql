-- A paid card dispute queues a refund; it must never claim no charge occurred.
do $migration$
declare v_definition text; v_old text; v_new text;
begin
  v_definition := pg_get_functiondef('public.goodies_admin_resolve_delivery_dispute(uuid,text)'::regprocedure);
  v_old := $old$v_notification_body := 'You were not charged for this order.';$old$;
  v_new := $new$v_notification_body := case when nullif(v_o.payment_provider_ref, '') is null
          then 'Your card refund requires manual review. Support will update you when its status changes.'
          else 'Your card refund is being processed. We will notify you when the refund status changes.'
        end;$new$;
  if position(v_old in v_definition)=0 then
    raise exception 'Expected card-dispute notification was not found; review deployed function before migrating';
  end if;
  execute replace(v_definition,v_old,v_new);
end;
$migration$;
