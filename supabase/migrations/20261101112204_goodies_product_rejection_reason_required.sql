create or replace function public.goodies_admin_review_product(p_product_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
 perform public.goodies_admin_assert();
 if p_status not in ('approved','rejected') then
   raise exception 'Invalid product review status' using errcode='22023';
 end if;
 if p_status = 'rejected' and nullif(trim(p_note),'') is null then
   raise exception 'A rejection reason is required' using errcode='22023';
 end if;
 update public.goodies_products
    set review_status=p_status,
        review_note=left(nullif(trim(p_note),''),500),
        reviewed_by=auth.uid(),
        reviewed_at=now(),
        is_available=(p_status='approved'),
        updated_at=now()
  where id=p_product_id;
 if not found then
   raise exception 'Product not found' using errcode='P0002';
 end if;
end
$function$;
