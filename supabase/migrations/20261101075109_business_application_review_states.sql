alter table public.business_applications drop constraint if exists business_applications_status_check;
alter table public.business_applications add constraint business_applications_status_check check (status = any (array['pending','in_review','needs_info','approved','rejected','restricted']::text[]));
drop index if exists public.business_applications_one_active_per_business_idx;
drop index if exists public.business_applications_one_active_unlinked_user_idx;
create unique index business_applications_one_active_per_business_idx on public.business_applications(business_id) where business_id is not null and status in ('pending','in_review','needs_info','approved','restricted');
create unique index business_applications_one_active_unlinked_user_idx on public.business_applications(user_id) where business_id is null and status in ('pending','in_review','needs_info','approved','restricted');
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
   where a.id=p_application_id and a.user_id=(select auth.uid()) and (a.status in ('pending','in_review','needs_info') or (a.status='rejected' and not a.final_rejection));
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
 if v_application.status not in ('rejected','needs_info') then raise exception 'Only an application requesting more information or a non-final rejection can be resubmitted' using errcode='P0001'; end if;
 if v_application.status='rejected' and v_application.final_rejection then raise exception 'This application was finally rejected. Contact Wantiss support for assistance.' using errcode='42501'; end if;
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

CREATE OR REPLACE FUNCTION public.wantiss_admin_review_business_application(p_application_id uuid, p_status text, p_review_note text DEFAULT NULL::text, p_final_rejection boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_applicant uuid; v_business uuid;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('approved','rejected','pending','in_review','needs_info') then raise exception 'Invalid status' using errcode='22023'; end if;
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
     when p_status in ('rejected','needs_info') then 'action'
     else 'pending' end
   where id=v_business;
 end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_application_reviewed','business_application',p_application_id::text,left(coalesce(p_review_note,''),500),jsonb_build_object('status',p_status,'final_rejection',coalesce(p_final_rejection,false),'business_id',v_business));
 if p_status in ('approved','rejected','needs_info') then
  insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
  values(v_applicant,null,case when p_status='approved' then 'Business application approved' when p_status='needs_info' then 'More information needed' else 'Business application update' end,
   case when p_status='approved' then 'Your business application was approved. You can continue setting up your business.'
        when p_status='needs_info' then 'Wantiss needs more information before it can continue reviewing your business application. Open your application to see the requested information.'
        else 'Your business application was not approved yet. Open your application in Wantiss to review the next steps.' end,
   'business_application_review','Ecosystem','business/application',
   jsonb_build_object('application_id',p_application_id,'status',p_status,'final_rejection',coalesce(p_final_rejection,false),'business_id',v_business));
 end if;
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
   and not exists(select 1 from public.business_applications a where a.business_id=b.id and a.status in ('pending','in_review','needs_info','approved','restricted') and a.id<>p_application_id)
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
 if v_status not in ('pending','in_review','needs_info','rejected') or coalesce(v_final_rejection,false) then raise exception 'Only open, resubmittable applications can be linked to a business' using errcode='P0001'; end if;
 select b.name into v_name from public.businesses b join public.business_members bm on bm.business_id=b.id
 where b.id=p_business_id and bm.user_id=v_user and bm.role='owner';
 if not found then raise exception 'The selected business is not owned by this applicant' using errcode='42501'; end if;
 if exists(select 1 from public.business_applications a where a.id<>p_application_id and a.business_id=p_business_id and a.status in ('pending','in_review','needs_info','approved','restricted')) then
  raise exception 'An active application is already linked to this business' using errcode='23505';
 end if;
 update public.business_applications set business_id=p_business_id,business_name=v_name,updated_at=now() where id=p_application_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values((select auth.uid()),'business_application_business_linked','business_application',p_application_id::text,'Application linked to applicant-owned business',jsonb_build_object('business_id',v_before),jsonb_build_object('business_id',p_business_id,'business_name',v_name));
end;
$function$;