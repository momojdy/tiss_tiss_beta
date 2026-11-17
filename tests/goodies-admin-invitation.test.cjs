const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const migration=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261117155800_goodies_admin_invitation_accepted_server_side.sql'),'utf8');
test('Goodies super-admin gate requires active verified staff plus accepted server invitation',()=>{
 const body=migration.split('create or replace function public.goodies_admin_assert()')[1].split('create or replace function public.wantiss_has_permission(')[0];
 assert.match(body,/s\.status\s*=\s*'active'/);
 assert.match(body,/s\.role\s*=\s*'super_admin'/);
 assert.match(body,/u\.email_confirmed_at is not null/);
 assert.match(body,/s\.invited_at is null or s\.invitation_expires_at is null/);
 assert.match(body,/s\.invitation_expires_at is null or s\.invitation_expires_at > now\(\)/);
 assert.doesNotMatch(body,/(user_metadata|raw_user_meta_data|app_metadata)/);
});
test('shared permission gate retains grants, level, revocation and invitation checks',()=>{
 const body=migration.split('create or replace function public.wantiss_has_permission(')[1];
 for(const expression of [
  /s\.invited_at is null or s\.invitation_expires_at is null/,
  /g\.staff_user_id=s\.user_id/,
  /g\.permission_key=p_permission/,
  /g\.revoked_at is null/,
  /g\.expires_at is null or g\.expires_at>now\(\)/,
  /when 'view' then g\.access_level in/,
  /when 'edit' then g\.access_level in/,
  /when 'manage' then g\.access_level='manage'/,
 ])assert.match(body,expression);
 assert.doesNotMatch(body,/(raw_user_meta_data|auth\.jwt\(\))/);
});
