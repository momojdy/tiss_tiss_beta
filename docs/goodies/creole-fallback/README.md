# Four approved languages with unfinished Haitian Creole fallback

**PASS — implemented and locally verified. NOT VERIFIED — deployed/hosted acceptance. No production schema or content was changed.**

The existing editor's critical-text check now allows an unfinished `ht` entry to remain saved when its English entry is a non-empty string explicitly marked `reviewed`. Creole text and review metadata are never rewritten or promoted. Draft, missing, unspecified and unrecognized Creole review states remain ineligible for production display; the existing customer resolver uses reviewed English. The explicit draft preview remains available for the super admin to finish Creole. Reviewed Creole remains eligible normally.

A new forward migration makes the same rule in the existing private server helper. It changes no publisher permissions, public RPCs, financial configuration or UI layout. The helper remains inaccessible to anonymous/authenticated direct calls. The migration stops transactionally if the base publication guard is missing, preventing a silently ineffective partial rollout.

## Evidence

- PASS — 19 admin CMS tests plus 4 existing access tests. New tests cover the four approved locales, unchanged Creole values/statuses, invalid/missing/draft English fallback, other-locale review requirements and the actual prepared release payload.
- PASS — 5 consumer CMS tests across configured locales, normal content lookup, policy/support/FAQ fallback and approved Creole display. The runtime resolver did not require a code change.
- PASS — 5 translation-release tests and 5,712 full-payload locale lookups. All 775 existing Creole entries and non-text/financial/policy values are unchanged.
- PASS — 7 Deno SQL/localization tests. The baseline test exercises the original guard; the forward-migration test exercises the final combined behavior. Real isolated Postgres trigger tests cover allowed pending Creole, refused unreviewed/missing/blank/non-string English, refused unreviewed French/Spanish/Chinese, unchanged review states, FAQ/policy protection, fee-only compatibility, helper privileges and failed-deployment rollback.
- PASS — TypeScript in both repositories, configured customer lint, CMS source register, unique migration versions and whitespace checks.
- PASS — Android and iOS admin JavaScript/Hermes exports. Signed native builds/hosted UI interaction are NOT VERIFIED.

The full prepared translation payload now has **zero Creole-related errors**. Its **five existing FAQ placeholder errors remain**, intentionally: the user deferred FAQ content, and this request did not authorize replacing those answers or removing that independent check. No Creole text or placeholder answer was silently approved to force publication.

## Rollout

1. Deploy [the base publication guard](../../../supabase/migrations/20261106084303_goodies_cms_publication_review_guard.sql) before [the forward fallback migration](../../../supabase/migrations/20261106144811_goodies_creole_reviewed_english_fallback.sql), with the approved migration/recovery process in [DEPLOYMENT.md](../DEPLOYMENT.md). Earlier candidate migrations retain their original contents/checksums.
2. Deploy the updated admin revision. No consumer layout or resolver change is required for this behavior.
3. Use an authenticated CMS publisher for actual publication after the independent FAQ check is resolved. Existing signed-in actor/permission checks and audit logging still apply. The connected SQL session's lack of a signed-in CMS actor is not bypassed.
4. Confirm the public endpoint and customer app show approved French/Spanish/Chinese, English for unfinished Creole fields, and reviewed Creole only for fields the super admin approves. That hosted result remains NOT VERIFIED here.

Read-only main inspection found neither the base guard/helper nor this new migration deployed; latest main migration remains `20261104211532`. Production deployment, authenticated publication, public cache refresh and installed-app acceptance remain outstanding. The inactive security-test project was not restored; only in-memory synthetic Postgres tests were used.

## Deployed baseline advisor

The read-only advisor returned five categories of existing notices; these do not validate the undeployed migration or prove each listed object vulnerable. The snapshot is in `deployed-security-advisor.json`. Remediation references: [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [extensions in public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous executable definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated executable definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No unrelated production settings or intentionally private tables were changed. The new candidate helper's denied direct-execution ACL was verified in isolation.
