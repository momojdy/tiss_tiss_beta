-- Allow applicants to replace rejected documents and explicitly resubmit a non-final rejection.
create or replace function public.submit_business_application_document(
  p_application_id uuid,
  p_document_type text,
  p_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  if p_document_type not in ('business_licence','tax_id','owner_id') then
    raise exception 'Invalid document type' using errcode='22023';
  end if;
  if p_storage_path is null
     or split_part(p_storage_path,'/',1) <> p_application_id::text
     or split_part(p_storage_path,'/',2) <> p_document_type then
    raise exception 'Document path does not match this application and document type' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.business_applications a
    where a.id=p_application_id
      and a.user_id=(select auth.uid())
      and (a.status='pending' or (a.status='rejected' and not a.final_rejection))
  ) then
    raise exception 'Application not found or cannot accept documents' using errcode='42501';
  end if;

  insert into public.business_application_documents(
    application_id,document_type,storage_path,status,review_note,reviewed_by,reviewed_at,submitted_at,updated_at
  ) values (
    p_application_id,p_document_type,p_storage_path,'pending',null,null,null,now(),now()
  )
  on conflict(application_id,document_type) do update
    set storage_path=excluded.storage_path,status='pending',review_note=null,
        reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
  returning id into v_id;
  return v_id;
end
$function$;

revoke all on function public.submit_business_application_document(uuid,text,text) from public,anon;
grant execute on function public.submit_business_application_document(uuid,text,text) to authenticated;

create or replace function public.resubmit_business_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_application public.business_applications%rowtype;
  v_missing text;
begin
  if v_uid is null then
    raise exception 'Sign in required' using errcode='28000';
  end if;

  select * into v_application
    from public.business_applications
   where id=p_application_id and user_id=v_uid
   for update;
  if not found then
    raise exception 'Application not found' using errcode='P0002';
  end if;
  if v_application.status <> 'rejected' then
    raise exception 'Only a rejected application can be resubmitted' using errcode='P0001';
  end if;
  if v_application.final_rejection then
    raise exception 'This application was finally rejected. Contact Wantiss support for assistance.' using errcode='42501';
  end if;

  select required.document_type into v_missing
    from (values ('business_licence'),('tax_id'),('owner_id')) required(document_type)
   where not exists (
     select 1 from public.business_application_documents d
      where d.application_id=p_application_id
        and d.document_type=required.document_type
        and d.status in ('pending','verified')
        and d.storage_path is not null
   )
   limit 1;
  if v_missing is not null then
    raise exception 'Replace or upload the % document before resubmitting', v_missing
      using errcode='P0001';
  end if;

  update public.business_applications
     set status='pending',review_note=null,reviewed_by=null,reviewed_at=null,
         final_rejection=false,updated_at=now()
   where id=p_application_id;

  insert into public.notifications(
    user_id,vendor_id,title,body,notification_type,feature_name,destination,metadata
  )
  select s.user_id,null,'Business application resubmitted',
         'A business application has been resubmitted and is ready for review.',
         'business_application_resubmitted','Ecosystem','admin/business-applications',
         jsonb_build_object('application_id',p_application_id,'status','pending')
    from public.wantiss_admin_staff s
   where s.status='active';

  return jsonb_build_object('id',p_application_id,'status','pending');
end
$function$;

revoke all on function public.resubmit_business_application(uuid) from public,anon;
grant execute on function public.resubmit_business_application(uuid) to authenticated;
