alter table public.wantiss_cms_assets
  drop column if exists public_storage_path,
  drop column if exists public_source_path;