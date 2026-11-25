# Arts & Lits — V8 native homepage baseline

## Status
Native implementation for the approved V8 Offline HTML design. The HTML is a visual blueprint only; it is not shipped or executed in the app. No WebView, iframe, HTML runtime, remote image dependency, or new native package was added. The previous `arts-lits/homepage-v8-baseline` WebView branch is superseded, not merged. This branch starts from consumer main at `82d9ba50e8f84c5cf061f0ef6b9f5dfcda44a3d9`.

Approved reference: `arts_lits_homepage_v8_offline.html`, 2,287,291 bytes; SHA-256 `b4a0f5e1b70aac4cf77cc04a1538f67eadc61018b9bcebfad3a89d8e7ecaed99`. All 47 embedded image occurrences resolve to 19 unique local original image files; the 22 logical keys are retained in `assets.ts` and `assets-manifest.json`. Exact image bytes, crop modes, sample content and typography hierarchy are preserved. Do not change approved visuals without founder approval. The V8 shelf has the flat wooden ledge rather than the older V5 textured gradient; the original flower SVG and 5° leaning Jane Eyre book are retained.

## Native structure
- `ArtsLitsHomeScreen.tsx`: homepage composition, native vertical and horizontal scrolling, safe areas, bottom navigation, theme and preview state. Each row remains directly editable.
- `components.tsx`: reusable native sections, photos, book shelf, flowers (native SVG), typography, poster overlays and original icon paths.
- `catalog.ts`: exact sample records from V8, not real catalog records.
- `model.ts`: shared preview visibility, access, pagination, search and destination contracts.
- `PreviewSheet.tsx`: native modal destination stack, search, preview controls, saved/reminder/follow interactions; home scroll remains mounted.
- `design.ts`: V8 design tokens and platform font selections. Georgia on iOS/web; Android native serif/sans fallback is not identical to Georgia/Arial. Native shadows and text metrics may vary. A screenshot comparison on physical iOS and Android is required before declaring pixel parity.
- `assets/`: locally bundled reference images; no network needed for these assets. `assets-manifest.json` records byte hashes and dimensions.

## Scope and business logic
This is a design baseline, not a production launch. Sample profile/connection/sponsorship states, floor access, prices, progress, creators, publications and products are clearly illustrative. No payment, server entitlement, real inventory, follow relationship, push notification, audiobook playback, creator settlement or ticket is created. Preview preferences use an isolated device-local key and must be replaced by user-scoped backend records before production. The existing Wantiss home icon opens Arts & Lits, native back returns to Wantiss. No Tiss Admin, CMS, Vendor Dashboard or Supabase change is included in this visual stage.

## Asset provenance and release restriction
V8 used a historical architectural photo and a cropped architectural model photograph from local sample imagery, three small Met public-domain artwork thumbnails (436524, 437881, 436105), local photographic sample references and original illustrative book cover layouts. Some images intentionally repeat or are thematic rather than literal depictions of the fictional venue, creator or product. Preserve them for design comparison only; verify licensing, attribution, quality and correct metadata before release. No institutional or creator partnership is implied.

## Verification
Run `node src/screens/ArtsLits/verify-native-v8.cjs` with repository dependencies installed. This checks asset SHA-256, catalog identity, search, paging, profile states and admission consistency and parses the TypeScript/TSX. Full native typecheck, Expo build, screenshot comparisons at 320/375/390/430/768, VoiceOver/TalkBack, hardware-back and native safe-area tests remain required. Do not infer native pixel equality from the HTML browser checks.

## Next design stages
Freeze this baseline after visual comparison, then refine the homepage row by row and button by button. Museum discovery and entrance, 3D and scrollable gallery, floors, admission, and protected artwork viewing follow. Library, Explore/marketplace, community/memberships, and complete admin/vendor/CMS/backend/security/payment integration are subsequent stages. Maintain a single server-authorized entitlement model for eventual production.
