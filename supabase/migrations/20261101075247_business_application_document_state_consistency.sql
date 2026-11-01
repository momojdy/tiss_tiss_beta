CREATE OR REPLACE FUNCTION public.submit_business_application_document(p_application_id uuid, p_document_type text, p_storage_path text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_business uuid; v_app_status text;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_document_type not in ('business_licence','tax_id','owner_id') then raise exception 'Invalid document type' using errcode='22023'; end if;
  if p_storage_path is null or split_part(p_storage_path,'/',1)<>p_application_id::text or split_part(p_storage_path,'/',2)<>p_document_type then raise exception 'Document path does not match this application and document type' using errcode='22023'; end if;
  select a.business_id,a.status into v_business,v_app_status from public.business_applications a
   where a.id=p_application_id and a.user_id=(select auth.uid()) and (a.status in ('pending','in_review','needs_info') or (a.status='rejected' and not a.final_rejection));
  if not found then raise exception 'Application not found or cannot accept documents' using errcode='42501'; end if;
  insert into public.business_application_documents(application_id,document_type,storage_path,status,review_note,reviewed_by,reviewed_at,submitted_at,updated_at)
  values(p_application_id,p_document_type,p_storage_path,'pending',null,null,null,now(),now())
  on conflict(application_id,document_type) do update set storage_path=excluded.storage_path,status='pending',review_note=null,reviewed_by=null,reviewed_at=null,submitted_at=now(),updated_at=now()
  returning id into v_id;
  if v_business is not null and v_app_status in ('pending','in_review') then update public.businesses set verification='pending' where id=v_business; end if;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_admin_set_application_document_status(p_document_id uuid, p_status text, p_review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_app uuid; v_type text; v_business uuid; v_app_status text; v_final_rejection boolean;
begin
 if not public.wantiss_has_permission('operations','edit') then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status not in ('verified','rejected','missing') then raise exception 'Invalid document status' using errcode='22023'; end if;
 if p_status in ('rejected','missing') and length(trim(coalesce(p_review_note,'')))<3 then raise exception 'Provide a review reason' using errcode='22023'; end if;
 update public.business_application_documents set status=p_status,review_note=left(trim(coalesce(p_review_note,'')),1000),reviewed_by=(select auth.uid()),reviewed_at=now(),updated_at=now()
 where id=p_document_id returning application_id,document_type into v_app,v_type;
 if not found then raise exception 'Application document not found' using errcode='P0002'; end if;
 select business_id,status,final_rejection into v_business,v_app_status,v_final_rejection from public.business_applications where id=v_app;
 if v_business is not null then
  if coalesce(v_final_rejection,false) then update public.businesses set verification='restricted' where id=v_business;
  elsif p_status in ('rejected','missing') or v_app_status in ('rejected','needs_info') then update public.businesses set verification='action' where id=v_business;
  elsif not exists(select 1 from public.business_application_documents d where d.application_id=v_app and d.status in ('rejected','missing')) then update public.businesses set verification='pending' where id=v_business;
  end if;
 end if;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values((select auth.uid()),'business_application_document_reviewed','business_application_document',p_document_id::text,left(trim(coalesce(p_review_note,'')),500),jsonb_build_object('application_id',v_app,'document_type',v_type,'status',p_status));
end;
$function$;