# Reproduce local Goodies acceptance

The existing `Expo validation` GitHub Actions workflow now runs the local API test job. It requires no Supabase, Stripe or Expo account secret. It creates only local Docker services and a disposable socket-only PostgreSQL cluster. It never accepts a hosted database/API URL.

Requirements: Linux x64, Node 22, local Docker access, Deno 2.9.6, the locked application dependencies, `pg@8.23.1` and the pinned native `@embedded-postgres/linux-x64@17.6.0-beta.15` binary. Install database tools outside the app. Restore the pinned package's library symlinks using its reviewed `scripts/hydrate-symlinks.js` when installing with `--ignore-scripts`. The workflow contains the exact setup commands.

Prime the real Edge handler's Deno cache, then run:

```bash
deno check --config supabase/functions/deno.json supabase/functions/wantiss-public-content/index.ts
GOODIES_TEST_PG_MODULE=/absolute/test-tools/node_modules/pg \
node scripts/test-goodies-local-api.cjs \
  --storage \
  --native-bin /absolute/test-tools/node_modules/@embedded-postgres/linux-x64/native/bin \
  --deno-bin /absolute/path/to/deno \
  --report /tmp/goodies-local-api.json
```

If setting `DENO_DIR`, use the same value for both commands. CMS execution uses `--cached-only` and permits network access only to `127.0.0.1`.

The runner uses digest-pinned official GoTrue/PostgREST/Storage images on an internal Docker network without published ports. A loopback proxy carries real HTTP over Docker exec TCP streams. It creates ten confirmed synthetic Auth identities and seeds local business roles and balances. Random credentials and JWT signing material are discarded and excluded from reports.

The schema is the reviewed Goodies target plus explicit shared Auth/CMS dependencies. With `--storage`, the official Storage service creates its own schema and stores actual private PNG bytes in the disposable directory. The test exercises the consumer proof resolver, signed downloads, MIME restrictions, cross-account access and evidence immutability after delivery. Omitting the flag retains the older metadata-only boundary. These cases are verified only when the runner completes successfully; adding the tests alone is not a pass.

This is not a full production reconstruction: unrelated feature foreign keys are omitted and scheduled execution is stubbed. Delivery coordinates and route geometry are synthetic test inputs. The runner does not contact Geoapify, Stripe, push providers or device sensors.

The recovery scenario stops its own local services and database, copies the full clean data directory, starts the copy, compares all table contents/function/role/policy fingerprints and retries authenticated checkout. This proves recovery of that synthetic database cluster only. It does not create or restore a production backup, copy the Storage file directory or verify hosted extensions.

The runner removes its own Docker resources and temporary cluster after execution. Do not point it at an existing cluster or substitute production credentials. The report's `productionContacted` and `hostedTestCreated` fields must remain false.

## Actual Stripe sandbox acceptance

This is an explicit opt-in extension, separate from credential-free CI. Authorize the official Stripe CLI in a **separate test sandbox with no enabled Dashboard webhook endpoints** through its browser login. Never paste keys into chat or use `--live`. The runner checks the CLI identity, private OAuth context, a real `livemode: false` API response and every page of webhook destinations before creating any provider object. It refuses an account that forwards events elsewhere; the local CLI listener does not stop Stripe from also sending Dashboard webhook deliveries. The CLI credentials stay outside the repository in a file owned by the current user with mode `0600`.

Cache executable dependencies as well as types:

```bash
deno cache --config supabase/functions/deno.json \
  supabase/functions/create-card-setup-intent/index.ts \
  supabase/functions/place-goodies-card-order/index.ts \
  supabase/functions/refund-goodies-card-order/index.ts \
  supabase/functions/process-goodies-card-refunds/index.ts \
  supabase/functions/rapid-api/index.ts

GOODIES_TEST_PG_MODULE=/absolute/test-tools/node_modules/pg \
node scripts/test-goodies-local-api.cjs \
  --native-bin /absolute/test-tools/node_modules/@embedded-postgres/linux-x64/native/bin \
  --deno-bin /absolute/path/to/deno \
  --stripe-sandbox \
  --stripe-cli /absolute/path/to/stripe \
  --stripe-config /private/path/stripe-config.toml \
  --stripe-profile wantiss-goodies-test \
  --stripe-account YOUR_APPROVED_SANDBOX_ACCOUNT_ID \
  --report /tmp/goodies-stripe-sandbox.json
```

This managed workspace requires `NODE_USE_ENV_PROXY=1` for external Node HTTPS calls; TLS verification remains enabled. Use the same `DENO_DIR` when caching and executing.

The repository's actual checkout, card setup, refund worker and webhook handlers run against the local Auth/PostgREST database and real Stripe sandbox. A private wrapper adds the CLI OAuth account/test-mode headers; it does not replace provider responses or business logic. The official CLI forwards actual signed events to loopback. A server-only publishable-key fixture deliberately excludes card-form and native/browser 3DS challenge acceptance.

Cases include ownership/tampering denials, real card saving, authoritative capture, simultaneous retries, process recovery, 3DS pending/cancellation, issuer decline, partial/full original-card refunds, signed/invalid/stale/reordered events, and open/won disputes. The runner refunds remaining successful payments only for its newly created synthetic sandbox customer. It never directly updates a production Supabase financial record, changes production credentials or configures a sandbox webhook to target production. The earlier provider run predated the forwarding preflight; its automatic hosted event receipts and verified absence of synthetic hosted financial records are documented separately in `stripe-webhook-configuration.json`.

The shared Stripe tables, indexes, grants and read RPC in the local target were inspected from production schema metadata. Vault remains a synthetic local worker-token boundary. Migration replay and transactional recovery are also checked by the existing PostgreSQL concurrency runner; those results do not establish full Wantiss backup restoration.
