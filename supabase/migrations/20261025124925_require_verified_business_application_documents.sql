
create table if not exists public.business_application_documents (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.business_applications(id) on delete cascade,
 document_type text not null check (document_type in ('business_licence','tax_id','owner_id')),
 storage_path text not null,
 status text not null default 'pending' check (status in ('pending','verified','rejected','missing')),
 review_note text, submitted_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(application_id,document_type)
);
create index if not exists business_application_documents_app_status_idx on public.business_application_documents(application_id,status);
alter table public.business_application_documents enable row level security;
drop policy if exists "Applicants view own business application documents" on public.business_application_documents;
create policy "Applicants view own business application documents" on public.business_application_documents for select to authenticated using (
 exists(select 1 from public.business_applications a where a.id=application_id and a.user_id=(select auth.uid()))
 or public.wantiss_has_permission('operations','edit'));
drop policy if exists "Applicants submit own pending business application documents" on public.business_application_documents;
create policy "Applicants submit own pending business application documents" on public.business_application_documents for insert to authenticated with check (
 status='pending' and reviewed_by is null and reviewed_at is null
 and exists(select 1 from public.business_applications a where a.id=application_id and a.user_id=(select auth.uid())));
drop policy if exists "Applicants replace own pending business application documents" on public.business_application_documents;
create policy "Applicants replace own pending business application documents" on public.business_application_documents for update to authenticated using (
 status in ('pending','rejected','missing') and exists(select 1 from public.business_applications a where a.id=application_id and a.user_id=(select auth.uid()))
) with check (status='pending' and reviewed_by is null and reviewed_at is null and exists(select 1 from public.business_applications a where a.id=application_id and a.user_id=(select auth.uid())));
grant select,insert,update on public.business_application_documents to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-application-documents','business-application-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Applicants upload own business application documents" on storage.objects;
create policy "Applicants upload own business application documents" on storage.objects for insert to authenticated with check (
 bucket_id='business-application-documents' and split_part(name,'/',2) in ('business_licence','tax_id','owner_id')
 and exists(select 1 from public.business_applications a where a.id::text=split_part(name,'/',1) and a.user_id=(select auth.uid())));
drop policy if exists "Applicants and reviewers read business application documents" on storage.objects;
create policy "Applicants and reviewers read business application documents" on storage.objects for select to authenticated using (
 bucket_id='business-application-documents' and (
  exists(select 1 from public.business_applications a where a.id::text=split_part(name,'/',1) and a.user_id=(select auth.uid()))
  or public.wantiss_has_permission('operations','edit')));
CREATE OR REPLACE FUNCTION public.submit_business_application_document(p_application_id uuid, p_document_type text, p_storage_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
 if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_document_type not in ('business_licence','tax_id','owner_id') then raise exception 'Invalid document type' using errcode='22023'; end if;
 if p_storage_path is null or split_part(p_storage_path,'/',1)<>p_application_id::text or split_part(p_storage_path,'/',2)<>p_document_type then
   raise exception 'Document path does not match this application and document type' using errcode='22023';
 end if;
 if not exists(select 1 from public.business_applications a where a.id=p_application_id and a.user_id=(select auth.uid()) and a.status in ('pending','rejected')) then
   raise exception 'Application not found or cannot accept documents' using errcode='42501';
 end if;
 insert into public.business_application_documents(application_id,document_type,storage_path,status,review_note,reviewed_by,reviewed_at,submitted_at,updated_at)
 values(p_application_id,p_document_type,p_storage_path,'pending',null,null,null,now(),now())
 on conflict(application_id,document_type) do update set storage_path=excluded.storage_path,status='pending',review_note=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
 returning id into v_id;
 return v_id;
end $function$
;
revoke all on function public.submit_business_application_document(uuid,text,text) from public,anon;
grant execute on function public.submit_business_application_document(uuid,text,text) to authenticated;
CREATE OR REPLACE FUNCTION public.wantiss_admin_set_application_document_status(p_document_id uuid, p_status text, p_review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_app uuid; v_type text;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('verified','rejected','missing') then raise exception 'Invalid document status' using errcode='22023'; end if;
 if p_status in ('rejected','missing') and length(trim(coalesce(p_review_note,'')))<3 then raise exception 'Provide a review reason' using errcode='22023'; end if;
 update public.business_application_documents set status=p_status,review_note=left(trim(coalesce(p_review_note,'')),1000),reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now()
 where id=p_document_id returning application_id,document_type into v_app,v_type;
 if not found then raise exception 'Application document not found' using errcode='P0002'; end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_application_document_reviewed','business_application_document',p_document_id::text,left(trim(coalesce(p_review_note,'')),500),jsonb_build_object('application_id',v_app,'document_type',v_type,'status',p_status));
end $function$
;
revoke all on function public.wantiss_admin_set_application_document_status(uuid,text,text) from public,anon;
grant execute on function public.wantiss_admin_set_application_document_status(uuid,text,text) to authenticated;
CREATE OR REPLACE FUNCTION public.wantiss_admin_review_business_application(p_application_id uuid, p_status text, p_review_note text DEFAULT NULL::text, p_final_rejection boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_applicant uuid;
begin
  if not public.wantiss_has_permission('operations','edit') then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_status not in ('approved','rejected','pending') then
    raise exception 'Invalid status' using errcode='22023';
  end if;
  if p_final_rejection and p_status <> 'rejected' then
    raise exception 'Final rejection is only valid for rejected applications' using errcode='22023';
  end if;
  if p_status='approved' and exists (
    select 1 from (values ('business_licence'),('tax_id'),('owner_id')) required(document_type)
    where not exists (
      select 1 from public.business_application_documents d
      where d.application_id=p_application_id and d.document_type=required.document_type and d.status='verified'
    )
  ) then
    raise exception 'Cannot approve this application until the business licence, tax ID, and owner ID are uploaded and verified' using errcode='P0001';
  end if;
  update public.business_applications
    set status=p_status, review_note=left(coalesce(p_review_note,''),2000),
        final_rejection=coalesce(p_final_rejection,false),
        reviewed_by=(select auth.uid()), reviewed_at=now(), updated_at=now()
    where id=p_application_id
    returning user_id into v_applicant;
  if not found then raise exception 'Application not found' using errcode='P0002'; end if;

  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
  values ((select auth.uid()),'business_application_reviewed','business_application',p_application_id::text,
    left(coalesce(p_review_note,''),500),
    jsonb_build_object('status',p_status,'final_rejection',coalesce(p_final_rejection,false)));

  if p_status in ('approved','rejected') then
    insert into public.notifications(user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata)
    values (
      v_applicant, null,
      case when p_status='approved' then 'Business application approved' else 'Business application update' end,
      case when p_status='approved'
        then 'Your business application was approved. You can continue setting up your business.'
        else 'Your business application was not approved yet. Open your application in Wantiss to review the next steps.'
      end,
      'business_application_review', 'Ecosystem', 'business/application',
      jsonb_build_object('application_id',p_application_id,'status',p_status,'final_rejection',coalesce(p_final_rejection,false))
    );
  end if;
end $function$
;
revoke all on function public.wantiss_admin_review_business_application(uuid,text,text,boolean) from public,anon;
grant execute on function public.wantiss_admin_review_business_application(uuid,text,text,boolean) to authenticated;
