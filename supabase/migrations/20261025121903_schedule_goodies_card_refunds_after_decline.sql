create extension if not exists pg_net;
do $seed$
begin
  if not exists(select 1 from vault.secrets where name='goodies_refund_worker_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'goodies_refund_worker_token','Authenticates the scheduled Goodies card refund worker');
  end if;
end $seed$;

create or replace function public.get_goodies_refund_worker_token()
returns text language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Not authorized' using errcode='42501'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1);
end $$;
revoke all on function public.get_goodies_refund_worker_token() from public,anon,authenticated;
grant execute on function public.get_goodies_refund_worker_token() to service_role;

create or replace function public.complete_goodies_card_refund(p_order_id uuid,p_refund_id text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_o public.goodies_orders%rowtype;
begin
  select * into v_o from public.goodies_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_o.payment_method<>'card' or v_o.status not in ('declined','expired','cancelled') then raise exception 'Order is not eligible for card refund' using errcode='P0001'; end if;
  if v_o.payment_status='refunded' then return false; end if;
  if v_o.payment_status not in ('paid','refund_pending') then raise exception 'Card payment is not refundable in its current state' using errcode='P0001'; end if;
  update public.goodies_orders set payment_status='refunded',updated_at=now() where id=p_order_id;
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
  values(v_o.customer_id,null,'Goodies card refund completed',
    'Your card refund for order '||v_o.order_code||' has been processed by your payment provider. Posting time depends on your bank.',
    'goodies_order','Goodies','goodies/orders',
    jsonb_build_object('order_id',v_o.id,'order_code',v_o.order_code,'status',v_o.status,'payment_status','refunded','refund_id',p_refund_id));
  return true;
end $$;
revoke all on function public.complete_goodies_card_refund(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_goodies_card_refund(uuid,text) to service_role;

create or replace function public.queue_goodies_card_refund_on_terminal_status()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status in ('declined','expired','cancelled') and old.status is distinct from new.status
     and new.payment_method='card' and new.payment_status='paid' then
    if nullif(new.payment_provider_ref,'') is null then
      update public.goodies_orders set payment_status='refund_manual_review',updated_at=now() where id=new.id;
    else
      update public.goodies_orders set payment_status='refund_pending',updated_at=now() where id=new.id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists goodies_card_refund_queue_on_terminal_status on public.goodies_orders;
create trigger goodies_card_refund_queue_on_terminal_status after update of status on public.goodies_orders
for each row execute function public.queue_goodies_card_refund_on_terminal_status();

do $patch$
declare v_def text; v_before text;
begin
  v_def:=pg_get_functiondef('public.goodies_order_notify(uuid,text,text,uuid,text,text,text)'::regprocedure);
  v_before:=v_def;
  v_def:=replace(v_def,
    $old$begin
  if p_user_id is null then return; end if;$old$,
    $new$declare v_method text; v_payment_status text; v_customer uuid;
begin
  if p_user_id is null then return; end if;
  if p_status in ('declined','expired','cancelled') then
    select payment_method,payment_status,customer_id into v_method,v_payment_status,v_customer from public.goodies_orders where id=p_order_id;
    if p_user_id=v_customer and v_method='card' then
      if v_payment_status='refund_pending' then
        p_body:=regexp_replace(p_body,' You were not charged for this order\.?$','')||' Your card refund is being processed.';
      elsif v_payment_status='refund_manual_review' then
        p_body:=regexp_replace(p_body,' You were not charged for this order\.?$','')||' We are reviewing your card refund and will update you.';
      end if;
    end if;
  end if;$new$);
  if v_def=v_before or position('Your card refund is being processed.' in v_def)=0 then raise exception 'Could not harden Goodies payment notifications'; end if;
  execute v_def;
end $patch$;

do $schedule$
begin
  perform cron.unschedule(jobid) from cron.job where jobname='goodies-card-refund-worker';
  perform cron.schedule('goodies-card-refund-worker','* * * * *',
    $job$select net.http_post(
      url := 'https://ycbirmgppwavorwudlrv.supabase.co/functions/v1/process-goodies-card-refunds',
      headers := jsonb_build_object('Content-Type','application/json','x-goodies-worker-token',
        (select decrypted_secret from vault.decrypted_secrets where name='goodies_refund_worker_token' limit 1)),
      body := '{}'::jsonb
    );$job$);
end $schedule$;
