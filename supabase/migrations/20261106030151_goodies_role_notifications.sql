-- Keep role-owned events out of the customer inbox and supply the existing
-- vendor dashboard with the business/page metadata it needs for navigation.
begin;
create or replace function public.goodies_order_notify(p_user_id uuid,p_title text,p_body text,p_order_id uuid,p_order_code text,p_status text,p_reason_code text default null)
returns void language plpgsql security definer set search_path='' as $notify$
declare v_order public.goodies_orders%rowtype;v_destination text;v_type text;v_metadata jsonb;
begin
  if p_user_id is null then return;end if;
  select * into v_order from public.goodies_orders where id=p_order_id;
  if not found then return;end if;
  v_metadata:=jsonb_strip_nulls(jsonb_build_object('order_id',p_order_id,'order_code',p_order_code,'status',p_status,'reason_code',p_reason_code));
  if p_user_id=v_order.customer_id then
    v_destination:='goodies/orders';v_type:='goodies_order';
    if p_status in ('declined','expired','cancelled') and v_order.payment_method='card' then
      p_body:=regexp_replace(p_body,' You were not charged for this order\.?$','');
      if v_order.payment_status='refund_pending' and position('Your card refund is being processed' in p_body)=0 then
        p_body:=p_body||' Your card refund is being processed.';
      elsif v_order.payment_status='refund_manual_review' and position('manual review' in lower(p_body))=0 then
        p_body:=p_body||' Your card refund requires manual review.';
      end if;
    end if;
  elsif exists(select 1 from public.business_members bm where bm.business_id=v_order.business_id and bm.user_id=p_user_id) then
    v_destination:='business_goodies_orders';v_type:='goodies_vendor_order';
    v_metadata:=v_metadata||jsonb_build_object('business_id',v_order.business_id,'feature','Goodies','page','goodiesOrders','order',p_order_id);
  elsif p_user_id=v_order.courier_id then
    v_destination:='goodies_courier';v_type:='goodies_courier_order';
  else return;
  end if;
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values(p_user_id,null,left(p_title,120),left(p_body,1000),v_type,'Goodies',v_destination,v_metadata);
end $notify$;
revoke all on function public.goodies_order_notify(uuid,text,text,uuid,text,text,text) from public,anon,authenticated;

create or replace function private.goodies_product_review_notifications()
returns trigger language plpgsql security definer set search_path='' as $notify$
begin
  if tg_op='UPDATE' and new.review_status is not distinct from old.review_status then return new;end if;
  if new.review_status='pending' then
    insert into public.notifications(user_id,title,body,notification_type,feature_name,destination,metadata)
    select s.user_id,'Goodies product awaiting review',left(new.name||' was submitted for product review.',1000),
      'goodies_admin_product_submission','Goodies','goodiesProducts',
      jsonb_build_object('business_id',new.business_id,'product_id',new.id)
    from public.wantiss_admin_staff s join auth.users u on u.id=s.user_id
    where s.status='active' and s.role='super_admin' and u.email_confirmed_at is not null
      and (s.invitation_expires_at is null or s.invitation_expires_at>now());
  elsif new.review_status in ('approved','rejected') then
    insert into public.notifications(user_id,title,body,notification_type,feature_name,destination,metadata)
    select bm.user_id,'Goodies product '||new.review_status,
      left(new.name||case when new.review_status='approved' then ' is approved for your store.' else ' was rejected. '||coalesce(new.review_note,'') end,1000),
      'goodies_vendor_product_review','Goodies','business_goodies_products',
      jsonb_build_object('business_id',new.business_id,'product_id',new.id,'feature','Goodies','page','goodiesProducts')
    from public.business_members bm where bm.business_id=new.business_id;
  end if;
  return new;
end $notify$;
revoke all on function private.goodies_product_review_notifications() from public,anon,authenticated;
create trigger goodies_product_review_notifications after insert or update on public.goodies_products
  for each row execute function private.goodies_product_review_notifications();
commit;
