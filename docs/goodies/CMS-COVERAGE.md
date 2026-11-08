# Goodies CMS coverage verification — 2026-11-06

The existing version-5 `goodies.content` model and existing draft/save/publish
architecture are retained. No production record was saved or published, no schema
was changed, and Wantiss Security Test was not restored.

## Verified source and editing contracts

- **PASS:** All 33 discovered customer route cases have a manual-editor page entry.
  The register also includes courier content, shared controls, scheduling, review,
  contact and group sheets, individual sheet kinds and notification templates.
- **PASS:** 1,246 unique platform text keys are registered. Tests edit every one in
  all five configured locales, serialize through the real save sanitizer and resolve
  edited values with the real customer content reader. This is 6,230 locale/field
  combinations, not 6,230 independent UI tests.
- **PASS:** Source guard finds no direct alphabetic JSX text or literal text/label
  props bypassing the CMS in the checked customer screens/shared components.
  Dictionary-based `tr()` calls and explicit dynamic policy/address/stage keys are
  included in the source register. This guard is not a proof about arbitrary
  runtime strings, third-party interfaces or future code not included in its scope.
- **PASS:** Existing content and translations win over generated defaults; opening
  older drafts adds only missing fields. Legacy string content keeps its English
  wording when another locale is edited. Edits become draft, never human-reviewed.
- **PASS:** Actual structured-editor JSX handlers edit FAQs, support topics, policy
  bodies and restriction wording, preserve other locales and disable editing for
  read-only access. Tests substitute native widget/theme boundaries; they are not
  a native-device interaction test.
- **PASS:** Existing coupon wording can be edited without exposing discount rules.
  Ingredient artwork now has manual name/image/visibility/layout access. Existing
  image upload, asset publication and signed-URL preview mechanisms are reused.
- **PASS:** Image metadata uses cursor pagination instead of the old 500-row RPC
  cap. A synthetic 650-asset test verifies completeness, ordering and denied-access
  errors. UI search reaches beyond the former first-20-images limit. Draft signing
  is batched. Main-project read-only metadata confirms SELECT/RLS and the existing
  `content.assets/view` permission predicate; no authorization was weakened.
- **PASS:** Internal payment feature keys remain constants; a regression test
  prevents CMS wording from replacing protocol keys. Required dynamic variables
  are validated on save; the existing generic store-search wording remains valid.
- **PASS:** Shared Add Card accepts an optional Goodies copy provider; ordinary
  Wallet callers retain defaults. CMS text embedded in the Stripe form is escaped.
- **PASS:** Customer content refresh now rerenders all routes. Standalone courier
  UI loads published CMS content and reads the existing account language preference.
- **PASS:** Source comparison preserves 1,991 existing visual attributes across
  14 changed customer/shared TSX files. This is not a pixel screenshot comparison.

## Content ownership and organization

Existing Home sections own service tiles, categories and promotion cards, including
images and emojis. The Pages section groups interface copy by actual source page.
FAQs, contact topics, policies, coupon wording and existing restriction messages
have dedicated sections. Existing ingredient artwork and builder configuration
stay in their established areas. New source keys use the existing `labels/Txt`
structure; no second CMS, identity, address or financial configuration system exists.

Vendor store/product/builder names, photos, descriptions, inventory, reviews,
customer profile/address/contact data, messages and order records remain in their
existing owner-managed records. Admin/vendor operational interfaces themselves
were not exhaustively migrated into a self-editing CMS in this change. This report
certifies the customer-page source register and named shared/courier coverage,
not every label in every Wantiss administrative or merchant screen.

Design-system icons, layout geometry, navigation identifiers, date/currency formats,
card-brand assets, OS permission dialogs and bank/Stripe-owned secure interfaces
are not unrestricted editorial fields. Platform-owned Add Card/verification labels
are registered; provider-owned challenges and validation UI remain provider-owned.
Financial eligibility, fee/discount calculations, availability and authorization
remain under their existing protected controls.

## Page register

The table establishes source representation and editable-key registration. All
full hosted UI journeys, pixel fidelity and publication checks remain NOT VERIFIED.
Collection schemas are editable in the existing sections named above; vendor-owned
records shown on these pages do not become CMS fields.

| Route | Page | Registered text keys | Additional content collections | Source representation |
| --- | --- | ---: | --- | --- |
| `wantiss` | Wantiss entry | 5 | — | PASS |
| `home` | Home | 34 | modes, cats, promos | PASS |
| `cats` | Categories | 1 | cats | PASS |
| `orders` | Order history | 11 | — | PASS |
| `cart` | Cart | 48 | — | PASS |
| `grouporder` | Group orders | 118 | — | PASS |
| `explore` | Explore | 20 | — | PASS |
| `search` | Search | 38 | — | PASS |
| `catlist` | Category / store results | 12 | cats | PASS |
| `store` | Store | 33 | — | PASS |
| `reviews` | Store reviews | 14 | — | PASS |
| `product` | Product | 27 | — | PASS |
| `checkout` | Checkout | 103 | — | PASS |
| `addcard` | Add card | 24 | — | PASS |
| `cardauth` | Card verification | 8 | — | PASS |
| `confirm` | Order confirmation | 10 | — | PASS |
| `track` | Order tracking | 88 | — | PASS |
| `notifs` | Notifications | 9 | — | PASS |
| `promos` | Promotions | 5 | coupons.title, coupons.desc | PASS |
| `flashdeals` | Flash deals | 5 | — | PASS |
| `favs` | Favorites | 6 | — | PASS |
| `byo` | Build Your Own | 75 | lib, separate existing builder configuration editor | PASS |
| `help` | Help / FAQs | 4 | faq | PASS |
| `settings` | Settings | 21 | — | PASS |
| `profile` | Profile | 10 | — | PASS |
| `addresses` | Addresses | 43 | — | PASS |
| `payments` | Payment methods | 29 | — | PASS |
| `contact` | Contact support | 25 | topics | PASS |
| `storechat` | Store conversation | 16 | — | PASS |
| `supdone` | Support confirmation | 5 | — | PASS |
| `policies` | Policies | 4 | legal | PASS |
| `policy` | Policy document | 6 | legal | PASS |
| `ndetail` | Notification detail | 3 | — | PASS |

## Executed checks and limits

| Check | Result | Evidence |
| --- | --- | --- |
| CMS customer tests | PASS | Four Node tests, including all-key/all-locale resolution and escaped card-form copy |
| CMS admin tests | PASS | Ten Node tests, including real structured-control handlers and 650-asset pagination |
| Admin access tests | PASS | Four existing permission regression tests |
| Backend regressions | PASS | 47 Deno tests, zero failures |
| Both TypeScript checks | PASS | Current checks complete without diagnostics |
| Configured customer lint | PASS | Existing lint command completes successfully |
| Expanded customer lint | PASS | Zero errors; existing warnings retained |
| Customer Android/iOS/web JS exports | PASS | Successful bundle logs; not native compilation/signing |
| Admin Android/iOS JS exports | PASS | Successful bundle logs; not native compilation/signing |
| Live draft/save/publish → fresh customer fetch | NOT VERIFIED | No test content was written to main; no publication authorized/performed |
| Every phone-preview interaction and exact visual parity | NOT VERIFIED | Existing mirrored preview is not identical to every native/customer service flow |
| Main authenticated role/Storage HTTP exercise | NOT VERIFIED | Metadata is verified; no role-authenticated mutation/session test performed |
| Human translation completeness | FAIL | Earlier published payload review gap remains; this change does not fabricate review |

Preview text lookup, category titles, policy/unavailable states, notification detail
and support-confirmation destinations were improved. Preview fixtures remain local
and explicitly synthetic. All customer routes have manual fields, but secure
provider flows and the full courier/group-order native interface are not certified
as complete interactive phone previews.

The Git branches contain reviewable implementation. Deploy compatible customer/admin
builds before saving/publishing a reviewed draft containing the new keys. Existing
published content keeps its existing fallbacks until that controlled publication.
The remaining unverified checks prevent a claim of 100% live production coverage.
