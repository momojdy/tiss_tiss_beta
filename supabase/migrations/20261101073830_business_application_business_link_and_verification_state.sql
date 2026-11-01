alter table public.businesses alter column verification set default 'setup';
alter table public.businesses drop constraint if exists businesses_verification_check;
alter table public.businesses add constraint businesses_verification_check check (verification = any (array['setup','pending','action','verified','restricted']::text[]));
alter table public.business_applications add column if not exists business_id uuid references public.businesses(id) on delete set null;
create index if not exists business_applications_business_id_idx on public.business_applications(business_id);
create unique index if not exists business_applications_one_pending_per_business on public.business_applications(business_id) where business_id is not null and status='pending';
CREATE OR REPLACE FUNCTION public.submit_business_application(p_business_name text, p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := trim(coalesce(p_business_name,''));
  v_application public.business_applications%rowtype;
begin
  if v_user_id is null then raise exception 'You must be signed in to apply for business verification.' using errcode='28000'; end if;
  if length(v_name)<2 or length(v_name)>160 then raise exception 'Business name must be between 2 and 160 characters.' using errcode='22023'; end if;
  if p_business_id is null then
    if exists(select 1 from public.business_members where user_id=v_user_id) then
      raise exception 'Select the business workspace this application belongs to.' using errcode='P0001';
    end if;
  elsif not exists(select 1 from public.business_members where business_id=p_business_id and user_id=v_user_id and role='owner') then
    raise exception 'Only the business owner can submit its verification application.' using errcode='42501';
  end if;

  select * into v_application
    from public.business_applications
   where user_id=v_user_id and business_id is not distinct from p_business_id
   order by created_at desc limit 1 for update;
  if found then
    if v_application.status='pending' then
      update public.business_applications set business_name=v_name,updated_at=now()
       where id=v_application.id returning * into v_application;
      if p_business_id is not null then update public.businesses set verification='pending' where id=p_business_id; end if;
    elsif v_application.status='rejected' then
      if v_application.final_rejection then
        raise exception 'This application was finally rejected. Contact Wantiss support for assistance.' using errcode='42501';
      end if;
      raise exception 'Replace the rejected documents and resubmit the existing application.' using errcode='P0001';
    end if;
    return jsonb_build_object('id',v_application.id,'status',v_application.status,'business_name',v_application.business_name,'business_id',v_application.business_id);
  end if;

  insert into public.business_applications(user_id,business_id,business_name)
  values(v_user_id,p_business_id,v_name) returning * into v_application;
  if p_business_id is not null then update public.businesses set verification='pending' where id=p_business_id; end if;
  return jsonb_build_object('id',v_application.id,'status',v_application.status,'business_name',v_application.business_name,'business_id',v_application.business_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_business_application(p_business_name text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.submit_business_application(p_business_name,null::uuid);
$function$;

CREATE OR REPLACE FUNCTION public.provision_approved_business()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_business_id uuid;
begin
  if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved') then
    if new.business_id is not null then
      if not exists(select 1 from public.business_members bm where bm.business_id=new.business_id and bm.user_id=new.user_id and bm.role='owner') then
        raise exception 'The application must be linked to a business owned by the applicant.' using errcode='42501';
      end if;
      update public.businesses set verification='verified' where id=new.business_id;
      if not found then raise exception 'The linked business no longer exists.' using errcode='P0002'; end if;
    else
      if exists(select 1 from public.business_members bm where bm.user_id=new.user_id) then
        raise exception 'Assign this application to the correct business before approving it.' using errcode='P0001';
      end if;
      insert into public.businesses(name,verification,is_live)
      values(new.business_name,'verified',false) returning id into v_business_id;
      insert into public.business_members(business_id,user_id,role)
      values(v_business_id,new.user_id,'owner') on conflict(business_id,user_id) do nothing;
      new.business_id:=v_business_id;
    end if;
    new.reviewed_at:=coalesce(new.reviewed_at,now());
  end if;
  new.updated_at:=now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_business_application_document(p_application_id uuid, p_document_type text, p_storage_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_business uuid;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_document_type not in ('business_licence','tax_id','owner_id') then raise exception 'Invalid document type' using errcode='22023'; end if;
  if p_storage_path is null or split_part(p_storage_path,'/',1)<>p_application_id::text or split_part(p_storage_path,'/',2)<>p_document_type then raise exception 'Document path does not match this application and document type' using errcode='22023'; end if;
  select a.business_id into v_business from public.business_applications a
   where a.id=p_application_id and a.user_id=(select auth.uid()) and (a.status='pending' or (a.status='rejected' and not a.final_rejection));
  if not found then raise exception 'Application not found or cannot accept documents' using errcode='42501'; end if;
  insert into public.business_application_documents(application_id,document_type,storage_path,status,review_note,reviewed_by,reviewed_at,submitted_at,updated_at)
  values(p_application_id,p_document_type,p_storage_path,'pending',null,null,null,now(),now())
  on conflict(application_id,document_type) do update set storage_path=excluded.storage_path,status='pending',review_note=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
  returning id into v_id;
  if v_business is not null then update public.businesses set verification='pending' where id=v_business; end if;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resubmit_business_application(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=(select auth.uid()); v_application public.business_applications%rowtype; v_missing text;
begin
 if v_uid is null then raise exception 'Sign in required' using errcode='28000'; end if;
 select * into v_application from public.business_applications where id=p_application_id and user_id=v_uid for update;
 if not found then raise exception 'Application not found' using errcode='P0002'; end if;
 if v_application.status<>'rejected' then raise exception 'Only a rejected application can be resubmitted' using errcode='P0001'; end if;
 if v_application.final_rejection then raise exception 'This application was finally rejected. Contact Wantiss support for assistance.' using errcode='42501'; end if;
 select required.document_type into v_missing
 from (values('business_licence'),('tax_id'),('owner_id')) required(document_type)
 where not exists(select 1 from public.business_application_documents d where d.application_id=p_application_id and d.document_type=required.document_type and d.status in ('pending','verified') and d.storage_path is not null) limit 1;
 if v_missing is not null then raise exception 'Replace or upload the % document before resubmitting',v_missing using errcode='P0001'; end if;
 update public.business_applications set status='pending',review_note=null,reviewed_by=null,reviewed_at=null,final_rejection=false,updated_at=now() where id=p_application_id;
 if v_application.business_id is not null then update public.businesses set verification='pending' where id=v_application.business_id; end if;
 insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
 select s.user_id,null,'Business application resubmitted','A business application has been resubmitted and is ready for review.','business_application_resubmitted','Ecosystem','admin/business-applications',jsonb_build_object('application_id',p_application_id,'status','pending')
 from public.wantiss_admin_staff s where s.status='active';
 return jsonb_build_object('id',p_application_id,'status','pending','business_id',v_application.business_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_set_application_document_status(p_document_id uuid, p_status text, p_review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_app uuid; v_type text; v_business uuid;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('verified','rejected','missing') then raise exception 'Invalid document status' using errcode='22023'; end if;
 if p_status in ('rejected','missing') and length(trim(coalesce(p_review_note,'')))<3 then raise exception 'Provide a review reason' using errcode='22023'; end if;
 update public.business_application_documents set status=p_status,review_note=left(trim(coalesce(p_review_note,'')),1000),reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now()
 where id=p_document_id returning application_id,document_type into v_app,v_type;
 if not found then raise exception 'Application document not found' using errcode='P0002'; end if;
 select business_id into v_business from public.business_applications where id=v_app;
 if v_business is not null then
  if p_status in ('rejected','missing') then update public.businesses set verification='action' where id=v_business;
  elsif not exists(select 1 from public.business_application_documents d where d.application_id=v_app and d.status in ('rejected','missing')) then update public.businesses set verification='pending' where id=v_business;
  end if;
 end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_application_document_reviewed','business_application_document',p_document_id::text,left(trim(coalesce(p_review_note,'')),500),jsonb_build_object('application_id',v_app,'document_type',v_type,'status',p_status));
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_review_business_application(p_application_id uuid, p_status text, p_review_note text DEFAULT NULL::text, p_final_rejection boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_applicant uuid; v_business uuid;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status' using errcode='22023'; end if;
 if p_final_rejection and p_status<>'rejected' then raise exception 'Final rejection is only valid for rejected applications' using errcode='22023'; end if;
 select user_id,business_id into v_applicant,v_business from public.business_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found' using errcode='P0002'; end if;
 if p_status='approved' and exists(
   select 1 from (values('business_licence'),('tax_id'),('owner_id')) required(document_type)
   where not exists(select 1 from public.business_application_documents d where d.application_id=p_application_id and d.document_type=required.document_type and d.status='verified')
 ) then raise exception 'Cannot approve until the business licence, tax ID, and owner ID are uploaded and verified' using errcode='P0001'; end if;
 if p_status='approved' and v_business is null and exists(select 1 from public.business_members bm where bm.user_id=v_applicant) then
   raise exception 'Link this application to the applicant’s correct business before approving it.' using errcode='P0001';
 end if;
 update public.business_applications
 set status=p_status,review_note=left(coalesce(p_review_note,''),2000),final_rejection=coalesce(p_final_rejection,false),
     reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now()
 where id=p_application_id returning business_id into v_business;
 if v_business is not null then
   update public.businesses set verification=case
     when p_status='approved' then 'verified'
     when p_status='rejected' and coalesce(p_final_rejection,false) then 'restricted'
     when p_status='rejected' then 'action'
     else 'pending' end
   where id=v_business;
 end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_application_reviewed','business_application',p_application_id::text,left(coalesce(p_review_note,''),500),jsonb_build_object('status',p_status,'final_rejection',coalesce(p_final_rejection,false),'business_id',v_business));
 if p_status in ('approved','rejected') then
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
  values(v_applicant,null,case when p_status='approved' then 'Business application approved' else 'Business application update' end,
   case when p_status='approved' then 'Your business application was approved. You can continue setting up your business.'
        else 'Your business application was not approved yet. Open your application in Wantiss to review the next steps.' end,
   'business_application_review','Ecosystem','business/application',
   jsonb_build_object('application_id',p_application_id,'status',p_status,'final_rejection',coalesce(p_final_rejection,false),'business_id',v_business));
 end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_set_business_verification(p_business uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.wantiss_has_permission('ecosystem','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('setup','pending','action','verified','restricted') then raise exception 'Invalid status' using errcode='22023'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason of at least 3 characters is required' using errcode='22023'; end if;
 update public.businesses set verification=p_status where id=p_business;
 if not found then raise exception 'Business not found' using errcode='P0002'; end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_verification_set','business',p_business::text,left(trim(p_reason),500),jsonb_build_object('verification',p_status));
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_application_businesses(p_application_id uuid)
 RETURNS TABLE(business_id uuid, business_name text, member_role text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid;
begin
 if not public.wantiss_has_permission('operations','view') then raise exception 'Not authorized' using errcode='42501'; end if;
 select user_id into v_user from public.business_applications where id=p_application_id;
 if not found then raise exception 'Application not found' using errcode='P0002'; end if;
 return query select b.id,b.name,bm.role from public.business_members bm join public.businesses b on b.id=bm.business_id
 where bm.user_id=v_user and bm.role='owner'
   and not exists(select 1 from public.business_applications a where a.business_id=b.id and a.status='pending' and a.id<>p_application_id)
 order by b.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_assign_business_application(p_application_id uuid, p_business_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid; v_status text; v_name text; v_before uuid; v_final_rejection boolean;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 select user_id,status,business_id,final_rejection into v_user,v_status,v_before,v_final_rejection from public.business_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found' using errcode='P0002'; end if;
 if v_status not in ('pending','rejected') or coalesce(v_final_rejection,false) then raise exception 'Only open, resubmittable applications can be linked to a business' using errcode='P0001'; end if;
 select b.name into v_name from public.businesses b join public.business_members bm on bm.business_id=b.id
 where b.id=p_business_id and bm.user_id=v_user and bm.role='owner';
 if not found then raise exception 'The selected business is not owned by this applicant' using errcode='42501'; end if;
 if exists(select 1 from public.business_applications a where a.id<>p_application_id and a.business_id=p_business_id and a.status='pending') then
  raise exception 'Another pending application is already linked to this business' using errcode='23505';
 end if;
 update public.business_applications set business_id=p_business_id,business_name=v_name,updated_at=now() where id=p_application_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values((select auth.uid()),'business_application_business_linked','business_application',p_application_id::text,'Application linked to applicant-owned business',jsonb_build_object('business_id',v_before),jsonb_build_object('business_id',p_business_id,'business_name',v_name));
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_dashboard_snapshot(p_domain text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_items jsonb;
begin
 if not (
  (p_domain='operations' and public.wantiss_has_permission('operations','view')) or
  (p_domain='ecosystem' and public.wantiss_has_permission('ecosystem','view')) or
  (p_domain='finance' and public.wantiss_has_permission('finance','view')) or
  (p_domain='people' and public.wantiss_has_permission('people','view')) or
  (p_domain='support' and public.wantiss_has_permission('support','view'))
 ) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_domain='operations' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select a.id,a.user_id,a.business_id,a.business_name,a.status,a.review_note,a.reviewed_by,a.reviewed_at,a.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('document_type',d.document_type,'status',d.status) order by d.document_type)
      from public.business_application_documents d where d.application_id=a.id),'[]'::jsonb) as documents
   from public.business_applications a order by a.created_at desc limit 500) x;
 elsif p_domain='ecosystem' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,name,verification,is_live,payout_ready,city,country,created_at from public.businesses order by created_at desc limit 500) x;
 elsif p_domain='finance' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (
   select wt.id::text as id,wt.user_id,wt.amount,
    case when coalesce(rq.pending_amount,0)>0 then 'Refund pending'
      when lower(wt.status)='completed' then 'Completed' when lower(wt.status)='pending' then 'Pending'
      when lower(wt.status)='failed' then 'Failed' when lower(wt.status)='refunded' then 'Refunded' else wt.status end as status,
    wt.description,wt.feature_name,wt.activity_type,wt.created_at,coalesce(rq.refunded_amount,0) as ref,coalesce(rq.pending_amount,0) as rq
   from public.wallet_transactions wt
   left join lateral (
    select coalesce(sum(amount) filter(where status='approved'),0) as refunded_amount,
     coalesce(sum(amount) filter(where status='pending'),0) as pending_amount
    from public.wantiss_admin_refund_requests rr where rr.transaction_id=wt.id
   ) rq on true
   union all
   select ('ADJ-'||fa.id::text) as id,fa.target_user_id as user_id,fa.amount,'Pending'::text as status,
    fa.reason as description,('Adjustment · '||fa.adjustment_type) as feature_name,'Adjustment'::text as activity_type,fa.created_at,0::numeric as ref,0::numeric as rq
   from public.wantiss_admin_financial_adjustments fa where fa.status='pending'
   order by created_at desc limit 1000
  ) x;
 elsif p_domain='people' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,full_name,email,role,created_at from public.profiles order by created_at desc limit 500) x;
 elsif p_domain='support' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_items from (select id,user_id,email,subject,message,status,created_at from public.settings_support_requests order by created_at desc limit 500) x;
 else raise exception 'Unknown domain'; end if;
 return jsonb_build_object('items',coalesce(v_items,'[]'::jsonb));
end $function$;
revoke all on function public.submit_business_application(text,uuid) from public,anon;
revoke all on function public.submit_business_application(text) from public,anon;
grant execute on function public.submit_business_application(text,uuid) to authenticated;
grant execute on function public.submit_business_application(text) to authenticated;
revoke all on function public.submit_business_application_document(uuid,text,text) from public,anon;
grant execute on function public.submit_business_application_document(uuid,text,text) to authenticated;
revoke all on function public.wantiss_admin_application_businesses(uuid) from public,anon;
grant execute on function public.wantiss_admin_application_businesses(uuid) to authenticated;
revoke all on function public.wantiss_admin_assign_business_application(uuid,uuid) from public,anon;
grant execute on function public.wantiss_admin_assign_business_application(uuid,uuid) to authenticated;
