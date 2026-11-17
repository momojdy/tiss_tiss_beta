# Goodies

`src/screens/Goodies/goodiesHomeScreen.tsx` mounts the customer module in the existing Wantiss navigation. `GoodiesCourierScreen.tsx` is the assigned courier workspace. Vendor screens remain under `src/screens/businessSpace/`.

Catalogs, builders, reviews, orders and payment states come from Supabase. Local storage holds account-owned caches, cart/builder drafts and idempotency journals. It is not a source of payment confirmation or purchasable inventory. Prices and permissions are validated on the server.

Shared Bill uses Wantiss Wallet. Its client build flag defaults off and the protected backend funding flag defaults off. Status, cancellation and refund recovery remain available independently. New payments require the reviewed backend package, the approved client build flag and explicit release activation. Test fixtures live in the test directories; no sample orders or courier movement are supplied by this module.

The admin repository's `goodiesConsumer` files form the isolated CMS draft preview. Generate them with `npm run sync:goodies-cms`; native/provider ports prevent publishing or payment execution from preview fixtures. The generator records source hashes and removes obsolete generated mirrors.

Run `npm run test:goodies`, `npm run test:goodies-cross-role`, `npm run check:goodies-cms`, `npm run check:migrations`, `npm run lint` and the full TypeScript check. Backend and native PostgreSQL commands and the remaining hosted/device acceptance requirements are documented under `docs/goodies/`.
