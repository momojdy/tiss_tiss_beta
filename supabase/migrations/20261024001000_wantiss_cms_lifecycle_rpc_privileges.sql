revoke all on function public.wantiss_admin_upsert_cms_version(text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.wantiss_admin_save_cms_draft(text,text,jsonb) to authenticated;
grant execute on function public.wantiss_admin_publish_cms_version(uuid) to authenticated;
grant execute on function public.wantiss_admin_archive_cms_version(uuid) to authenticated;
revoke insert, update, delete on public.wantiss_admin_audit_log from public, anon, authenticated;