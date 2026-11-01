drop index if exists public.business_applications_one_active_per_user_idx;
drop index if exists public.business_applications_one_pending_per_business;
create unique index business_applications_one_active_per_business_idx
  on public.business_applications(business_id)
  where business_id is not null and status in ('pending','approved','restricted');
create unique index business_applications_one_active_unlinked_user_idx
  on public.business_applications(user_id)
  where business_id is null and status in ('pending','approved','restricted');