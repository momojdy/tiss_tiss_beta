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
   and not exists(select 1 from public.business_applications a where a.business_id=b.id and a.status in ('pending','approved','restricted') and a.id<>p_application_id)
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
 if exists(select 1 from public.business_applications a where a.id<>p_application_id and a.business_id=p_business_id and a.status in ('pending','approved','restricted')) then
  raise exception 'An active application is already linked to this business' using errcode='23505';
 end if;
 update public.business_applications set business_id=p_business_id,business_name=v_name,updated_at=now() where id=p_application_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values((select auth.uid()),'business_application_business_linked','business_application',p_application_id::text,'Application linked to applicant-owned business',jsonb_build_object('business_id',v_before),jsonb_build_object('business_id',p_business_id,'business_name',v_name));
end;
$function$;