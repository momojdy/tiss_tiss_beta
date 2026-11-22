-- Financial promotions are managed outside the CMS. Existing checkout owns redemption locking.
create or replace function public.goodies_admin_promotions(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.goodies_finance_assert(false);
 return (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from
 (select * from public.goodies_promotions order by created_at desc,id offset greatest(0,coalesce(p_offset,0)) limit 50) p);
end $$;
create or replace function public.goodies_admin_save_promotion(p_id uuid,p_expected_updated_at timestamptz,p_data jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.goodies_promotions%rowtype; saved public.goodies_promotions%rowtype;
 code text; kind text; val numeric; minimum numeric; cap integer; start_at timestamptz; end_at timestamptz; sid text; active boolean;
begin
 perform private.goodies_finance_assert(true);
 if p_id is null or length(trim(coalesce(p_reason,''))) not between 10 and 500 or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid promotion' using errcode='22023'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) k where k not in ('code','discount_type','discount_value','min_subtotal','max_redemptions','starts_at','expires_at','store_id','is_active')) then raise exception 'Unsupported promotion setting' using errcode='22023';end if;
 code:=upper(trim(p_data->>'code'));kind:=p_data->>'discount_type';val:=(p_data->>'discount_value')::numeric;minimum:=(p_data->>'min_subtotal')::numeric;cap:=(p_data->>'max_redemptions')::integer;start_at:=(p_data->>'starts_at')::timestamptz;end_at:=(p_data->>'expires_at')::timestamptz;sid:=nullif(trim(p_data->>'store_id'),'');active:=(p_data->>'is_active')::boolean;
 if code is null or code !~ '^[A-Z0-9_-]{3,40}$' or kind is null or kind not in ('percent','free_delivery') or val is null or val::text in ('NaN','Infinity','-Infinity') or val<0 or val>100 or val<>round(val,2) or (kind='percent' and val=0) or (kind='free_delivery' and val<>0) or minimum is null or minimum::text in ('NaN','Infinity','-Infinity') or minimum<0 or minimum<>round(minimum,2) or active is null or (cap is not null and cap<1) or (start_at is not null and not isfinite(start_at)) or (end_at is not null and not isfinite(end_at)) or (start_at is not null and end_at is not null and end_at<=start_at) then raise exception 'Invalid promotion settings' using errcode='22023';end if;
 if sid is not null and not exists(select 1 from public.goodies_store_schedules where store_id=sid) then raise exception 'Store unavailable' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('goodies-promotion:'||p_id::text,0));
 select * into old from public.goodies_promotions where id=p_id for update;
 if (old.id is not null and old.updated_at is distinct from p_expected_updated_at) or (old.id is null and p_expected_updated_at is not null) then raise exception 'Promotion changed; reload before saving' using errcode='40001';end if;
 if cap is not null and cap<coalesce(old.redemption_count,0) then raise exception 'Limit is below existing redemptions' using errcode='22023';end if;
 if old.redemption_count>0 and (code,kind,val,minimum,sid) is distinct from (old.code,old.discount_type,old.discount_value,old.min_subtotal,old.store_id) then raise exception 'Create a new code to change redeemed discount terms' using errcode='22023';end if;
 insert into public.goodies_promotions(id,code,discount_type,discount_value,min_subtotal,store_id,starts_at,expires_at,max_redemptions,is_active)
 values(p_id,code,kind,val,minimum,sid,start_at,end_at,cap,active)
 on conflict(id) do update set code=excluded.code,discount_type=excluded.discount_type,discount_value=excluded.discount_value,min_subtotal=excluded.min_subtotal,store_id=excluded.store_id,starts_at=excluded.starts_at,expires_at=excluded.expires_at,max_redemptions=excluded.max_redemptions,is_active=excluded.is_active,updated_at=clock_timestamp()
 returning * into saved;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values(auth.uid(),'goodies_promotion_save','goodies_promotion',p_id::text,trim(p_reason),case when old.id is not null then to_jsonb(old) end,to_jsonb(saved));
 return to_jsonb(saved);
end $$;
create or replace function public.goodies_public_promotions()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('code',p.code,'min',p.min_subtotal,'kind',case when p.discount_type='percent' then 'Percent' else 'Free delivery' end,'val',p.discount_value,'store',coalesce(p.store_id,'All stores'),'st','Live','from',p.starts_at,'to',p.expires_at) order by p.code),'[]'::jsonb)
 from public.goodies_promotions p where p.is_active and (p.starts_at is null or p.starts_at<=now()) and (p.expires_at is null or p.expires_at>now()) and (p.max_redemptions is null or p.redemption_count<p.max_redemptions)
 and (p.store_id is null or exists(select 1 from public.goodies_store_schedules s where s.store_id=p.store_id and s.is_live));
$$;
revoke all on function public.goodies_admin_promotions(integer),public.goodies_admin_save_promotion(uuid,timestamptz,jsonb,text),public.goodies_public_promotions() from public,anon,authenticated;
grant execute on function public.goodies_admin_promotions(integer),public.goodies_admin_save_promotion(uuid,timestamptz,jsonb,text) to authenticated;
grant execute on function public.goodies_public_promotions() to anon,authenticated,service_role;
