begin;
-- Extend the existing review table/API; keep one source of truth for all clients.
alter table public.goodies_order_reviews
 add column if not exists id uuid not null default gen_random_uuid() unique,
 add column if not exists review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
 add column if not exists review_note text,
 add column if not exists reviewed_by uuid references auth.users(id),
 add column if not exists reviewed_at timestamptz;
create index goodies_reviews_moderation_page on public.goodies_order_reviews(review_status,created_at desc,id);

create or replace function public.goodies_submit_order_review(p_order_id uuid,p_review_target text,p_rating integer,p_comment text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare request public.goodies_orders%rowtype;caller uuid:=auth.uid();review_id uuid;
begin
 if caller is null then raise exception 'Sign in required' using errcode='28000';end if;
 if not private.goodies_customer_can_access() then raise exception 'Goodies access required' using errcode='42501';end if;
 if p_review_target is null or p_review_target not in ('store','courier') or p_rating is null or p_rating not between 1 and 5 or char_length(coalesce(p_comment,''))>1000 then raise exception 'Invalid review' using errcode='22023';end if;
 select * into request from public.goodies_orders where id=p_order_id and customer_id=caller for share;
 if not found or request.status<>'completed' then raise exception 'Completed customer order required' using errcode='42501';end if;
 if p_review_target='courier' and (request.order_type='pickup' or request.courier_id is null or request.self_delivery) then raise exception 'Assigned Wantiss courier required' using errcode='22023';end if;
 insert into public.goodies_order_reviews(order_id,review_target,customer_id,business_id,courier_id,rating,comment)
 values(request.id,p_review_target,caller,request.business_id,case when p_review_target='courier' then request.courier_id end,p_rating,trim(coalesce(p_comment,'')))
 on conflict(order_id,review_target) do update set rating=excluded.rating,comment=excluded.comment,review_status='pending',review_note=null,reviewed_by=null,reviewed_at=null,updated_at=now()
 where goodies_order_reviews.rating is distinct from excluded.rating or goodies_order_reviews.comment is distinct from excluded.comment returning id into review_id;
 if review_id is null then select id into review_id from public.goodies_order_reviews where order_id=p_order_id and review_target=p_review_target;end if;return review_id;
end $$;

create or replace function public.goodies_store_reviews(p_store_id text,p_offset integer default 0,p_limit integer default 20)
returns table(order_id uuid,rating integer,comment text,created_at timestamptz,is_mine boolean)
language sql stable security definer set search_path='' as $$
 select r.order_id,r.rating,r.comment,r.created_at,r.customer_id=auth.uid()
 from public.goodies_order_reviews r join public.goodies_store_schedules s on s.business_id=r.business_id
 where auth.uid() is not null and s.store_id=p_store_id and s.is_live and r.review_target='store' and r.review_status='approved'
 order by r.created_at desc,r.order_id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,20),1),100)
$$;
create or replace function public.goodies_store_review_summaries(p_business_ids uuid[])
returns table(business_id uuid,rating numeric,review_count bigint)
language sql stable security definer set search_path='' as $$
 select r.business_id,avg(r.rating),count(*) from public.goodies_order_reviews r
 where auth.uid() is not null and r.review_target='store' and r.review_status='approved' and r.business_id=any(p_business_ids)
 and exists(select 1 from public.goodies_store_schedules s where s.business_id=r.business_id and s.is_live)
 group by r.business_id
$$;
-- Compatibility projections for the newer main clients: no reviewer identity.
create or replace function public.goodies_public_store_review_stats(p_store_ids text[])
returns table(store_id text,rating numeric,review_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if p_store_ids is null or cardinality(p_store_ids)>100 then raise exception 'Choose up to 100 stores' using errcode='22023';end if;
 return query select s.store_id,coalesce(round(avg(r.rating),1),0),count(r.id)
 from public.goodies_store_schedules s left join public.goodies_order_reviews r on r.business_id=s.business_id and r.review_target='store' and r.review_status='approved'
 where s.is_live and s.store_id=any(p_store_ids) group by s.store_id;
end $$;
create or replace function public.goodies_public_store_reviews(p_store_id text)
returns table(rating integer,comment text,created_at timestamptz,author_label text)
language sql stable security definer set search_path='' as $$
 select r.rating,r.comment,r.created_at,'Verified customer'::text from public.goodies_order_reviews r join public.goodies_store_schedules s on s.business_id=r.business_id
 where s.store_id=p_store_id and s.is_live and r.review_target='store' and r.review_status='approved'
 order by r.created_at desc,r.order_id limit 50
$$;
create function public.goodies_admin_list_reviews(p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform public.goodies_admin_assert();
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.order_id,r.business_id,s.store_name,r.review_target,r.rating,r.comment,r.review_status,r.review_note,r.created_at from public.goodies_order_reviews r left join public.goodies_store_schedules s on s.business_id=r.business_id order by r.created_at desc,r.id offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,50),1),100)) q);
end $$;
create or replace function public.goodies_admin_review_order_review(p_review_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare review public.goodies_order_reviews%rowtype;note text:=left(nullif(trim(coalesce(p_note,'')),''),500);
begin
 perform public.goodies_admin_assert();
 if p_status is null or p_status not in ('approved','rejected') or (p_status='rejected' and note is null) then raise exception 'Review decision and rejection reason required' using errcode='22023';end if;
 select * into review from public.goodies_order_reviews where id=p_review_id for update;
 if not found then raise exception 'Review unavailable' using errcode='P0002';end if;
 if review.review_status=p_status and review.review_note is not distinct from note then return;end if;
 if review.review_status<>'pending' then raise exception 'Review already decided' using errcode='22023';end if;
 update public.goodies_order_reviews set review_status=p_status,review_note=note,reviewed_by=auth.uid(),reviewed_at=now() where id=p_review_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state) values(auth.uid(),'goodies_review_'||p_status,'goodies_review',p_review_id::text,coalesce(note,'Review publication'),jsonb_build_object('status',review.review_status),jsonb_build_object('status',p_status));
end $$;
revoke all on function public.goodies_public_store_review_stats(text[]),public.goodies_public_store_reviews(text) from public;
grant execute on function public.goodies_public_store_review_stats(text[]),public.goodies_public_store_reviews(text) to anon,authenticated;
revoke all on function public.goodies_admin_list_reviews(integer,integer),public.goodies_admin_review_order_review(uuid,text,text) from public,anon;
grant execute on function public.goodies_admin_list_reviews(integer,integer),public.goodies_admin_review_order_review(uuid,text,text) to authenticated;
commit;
