-- HELP PAY: requested totals must pass the existing live Goodies validator; all wallet operations remain locked server-side.
create or replace function private.help_pay_reverse_locked(p_request_id uuid, p_result text)
returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_req public.help_pay_requests%rowtype; v_con public.help_pay_contributions%rowtype; v_count int:=0; v_tx uuid;
begin
 if p_result not in ('expired','cancelled') then raise exception 'Invalid refund result'; end if;
 select * into v_req from public.help_pay_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found'; end if;
 for v_con in select * from public.help_pay_contributions where request_id=p_request_id and status='paid' order by contributor_id,id for update loop
   insert into public.wallets(user_id,balance) values(v_con.contributor_id,0) on conflict(user_id) do nothing;
   update public.wallets set balance=balance+v_con.amount_cents::numeric/100,updated_at=now() where user_id=v_con.contributor_id;
   if not found then raise exception 'Could not refund wallet'; end if;
   insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
   values(v_con.contributor_id,v_con.amount_cents::numeric/100,'completed','Help Pay refund',v_con.amount_cents::numeric/100,'USD','Goodies','help_pay_refund','credit',v_con.id::text,jsonb_build_object('request_id',p_request_id,'contribution_id',v_con.id,'order_id',v_req.order_id))
   returning id into v_tx;
   update public.help_pay_contributions set status='refunded' where id=v_con.id;
   v_count:=v_count+1;
 end loop;
 update public.help_pay_requests set status=p_result,contributed_cents=0 where id=p_request_id;
 return v_count;
end $$;
revoke all on function private.help_pay_reverse_locked(uuid,text) from public,anon,authenticated;
create or replace function public.help_pay_create_request(p_mode text,p_total_cents bigint,p_checkout_key text,p_checkout_snapshot jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_user uuid:=auth.uid(); v_existing public.help_pay_requests%rowtype; v_id uuid; v_initial bigint; v_wallet numeric; v_tx uuid; v_s jsonb:=p_checkout_snapshot; v_total numeric;
begin
 if v_user is null then raise exception 'Sign in to create a payment request' using errcode='28000'; end if;
 if p_mode not in ('share','full') or p_total_cents is null or p_total_cents<1 or p_total_cents>100000000 then raise exception 'Invalid Help Pay amount' using errcode='22023'; end if;
 if p_checkout_key is null or length(btrim(p_checkout_key))<12 or length(p_checkout_key)>180 then raise exception 'Invalid checkout key' using errcode='22023'; end if;
 if jsonb_typeof(v_s) is distinct from 'object' or jsonb_typeof(v_s->'p_items') is distinct from 'array' then raise exception 'A live Goodies checkout is required' using errcode='22023'; end if;
 begin v_total := (v_s->>'p_total')::numeric; exception when others then raise exception 'Invalid Goodies checkout total'; end;
 if v_total is null or v_total<=0 or round(v_total*100)::bigint<>p_total_cents then raise exception 'The Help Pay total does not match the Goodies checkout'; end if;
 perform pg_advisory_xact_lock(hashtextextended('help-pay:'||v_user::text||':'||p_checkout_key,0));
 select * into v_existing from public.help_pay_requests where creator_id=v_user and checkout_key=p_checkout_key for update;
 if found then
   if v_existing.mode<>p_mode or v_existing.total_cents<>p_total_cents or v_existing.checkout_snapshot<>v_s then raise exception 'Checkout key is already used for different details'; end if;
   return v_existing.id;
 end if;
 -- Execute the exact store, price, options, fee, promo and delivery-quote validator.
 perform set_config('app.goodies_help_pay_validation','on',true);
 perform 1 from public.place_goodies_order(
   v_s->>'p_store_id',v_s->>'p_order_type',nullif(v_s->>'p_scheduled_for','')::timestamptz,
   v_s->'p_address',v_s->>'p_contact_phone',v_s->'p_items',(v_s->>'p_subtotal')::numeric,
   (v_s->>'p_delivery_fee')::numeric,(v_s->>'p_service_fee')::numeric,(v_s->>'p_discount')::numeric,
   (v_s->>'p_tip')::numeric,v_total,v_s->>'p_notes',v_s->>'p_promo_code'
 );
 perform set_config('app.goodies_help_pay_validation','off',true);
 v_initial := case when p_mode='share' then (p_total_cents*60+99)/100 else 0 end;
 if v_initial>0 then
   select balance into v_wallet from public.wallets where user_id=v_user for update;
   if not found then raise exception 'Create a Wantiss Wallet to pay your share'; end if;
   if v_wallet<v_initial::numeric/100 then raise exception 'Insufficient Wallet balance for your 60%% share'; end if;
 end if;
 insert into public.help_pay_requests(creator_id,service,mode,checkout_key,checkout_snapshot,total_cents,initial_cents,contributed_cents,currency,status,expires_at)
 values(v_user,'goodies',p_mode,p_checkout_key,v_s,p_total_cents,v_initial,0,'USD','active',now()+interval '30 minutes') returning id into v_id;
 if v_initial>0 then
   update public.wallets set balance=balance-v_initial::numeric/100,updated_at=now() where user_id=v_user and balance>=v_initial::numeric/100;
   if not found then raise exception 'Insufficient Wallet balance'; end if;
   insert into public.wallet_transactions(user_id,amount,status,description,wallet_amount,wallet_currency,feature_name,activity_type,direction,reference_id,metadata)
   values(v_user,v_initial::numeric/100,'completed','Help Pay upfront share',v_initial::numeric/100,'USD','Goodies','help_pay_upfront','debit',v_id::text,jsonb_build_object('request_id',v_id))
   returning id into v_tx;
   insert into public.help_pay_contributions(request_id,contributor_id,amount_cents,payment_method,idempotency_key,wallet_transaction_id,status)
   values(v_id,v_user,v_initial,'wallet','help-pay-upfront-'||v_id::text,v_tx,'paid');
 end if;
 return v_id;
end $$;
revoke all on function public.help_pay_create_request(text,bigint,text,jsonb) from public,anon;
grant execute on function public.help_pay_create_request(text,bigint,text,jsonb) to authenticated;
create or replace function public.help_pay_status(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r public.help_pay_requests%rowtype; caller uuid:=auth.uid(); mine bigint:=0; donors jsonb:='[]'::jsonb;
begin
 if caller is null then raise exception 'Sign in to view Help Pay'; end if;
 select * into r from public.help_pay_requests where id=p_request_id;
 if not found or (r.status='pending' and caller<>r.creator_id) then raise exception 'Payment request not found'; end if;
 select coalesce(sum(amount_cents),0) into mine from public.help_pay_contributions where request_id=r.id and contributor_id=caller and status='paid';
 if caller=r.creator_id then
   select coalesce(jsonb_agg(jsonb_build_object('name',coalesce(nullif(btrim(p.full_name),''),'Wantiss member'),'amount_cents',c.amount_cents,'user_id',c.contributor_id) order by c.created_at),'[]'::jsonb)
   into donors from public.help_pay_contributions c left join public.profiles p on p.id=c.contributor_id
   where c.request_id=r.id and c.status='paid' and c.contributor_id<>r.creator_id;
 end if;
 return jsonb_build_object('id',r.id,'mode',r.mode,'service',r.service,
  'status',case when r.status in ('active','pending') and r.expires_at<=now() then 'expired' else r.status end,
  'total_cents',r.total_cents,'initial_cents',r.initial_cents,
  'contributed_cents',r.contributed_cents,'remaining_cents',greatest(0,r.total_cents-r.initial_cents-r.contributed_cents),
  'expires_at',r.expires_at,'is_creator',caller=r.creator_id,'my_contributed_cents',mine,'contributors',donors,'order_id',case when caller=r.creator_id then r.order_id else null end);
end $$;
revoke all on function public.help_pay_status(uuid) from public,anon;
grant execute on function public.help_pay_status(uuid) to authenticated;
create or replace function public.help_pay_share_to_friend(p_request_id uuid,p_friend_id uuid)
returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_user uuid:=auth.uid(); v_req public.help_pay_requests%rowtype; v_conversation uuid; v_message text; v_name text;
begin
 if v_user is null then raise exception 'Sign in first'; end if;
 select * into v_req from public.help_pay_requests where id=p_request_id and creator_id=v_user for update;
 if not found or v_req.status<>'active' or v_req.expires_at<=now() then raise exception 'This Help Pay request is no longer shareable'; end if;
 if p_friend_id is null or p_friend_id=v_user or not exists(
   select 1 from public.user_friendships where status='accepted' and
   ((requester_id=v_user and recipient_id=p_friend_id) or (requester_id=p_friend_id and recipient_id=v_user))
 ) then raise exception 'You can only send a payment card to an accepted friend'; end if;
 perform pg_advisory_xact_lock(hashtextextended('friend-chat:'||least(v_user::text,p_friend_id::text)||':'||greatest(v_user::text,p_friend_id::text),0));
 select id into v_conversation from public.conversations where feature='friends'
   and participant_ids @> array[v_user,p_friend_id]::uuid[] and array_length(participant_ids,1)=2
   order by created_at limit 1;
 if v_conversation is null then
   select coalesce(nullif(btrim(full_name),''),'Wantiss member') into v_name from public.profiles where id=p_friend_id;
   insert into public.conversations(participant_ids,customer_id,feature,status,title)
   values(array[v_user,p_friend_id],v_user,'friends','active',coalesce(v_name,'Wantiss member'))
   returning id into v_conversation;
 end if;
 v_message := '[wantiss-attachment-v1]'||jsonb_build_object(
  'kind','help-pay','name','Help pay a Goodies order','reference','wantiss://help-pay/'||p_request_id::text
 )::text;
 insert into public.messages(conversation_id,sender_id,body) values(v_conversation,v_user,v_message);
 update public.conversations set updated_at=now() where id=v_conversation;
 return v_conversation;
end $$;
revoke all on function public.help_pay_share_to_friend(uuid,uuid) from public,anon;
grant execute on function public.help_pay_share_to_friend(uuid,uuid) to authenticated;
