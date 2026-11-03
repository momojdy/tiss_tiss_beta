-- Published CMS images are served through a status-checked Edge Function proxy.
-- Keep the unused bucket private so it cannot become an accidental public upload surface.
update storage.buckets set public = false where id = 'wantiss-public-assets';
