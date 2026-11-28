# Habita — native homepage integration (V17)

Status: development branch; visual acceptance and production readiness OPEN. No WebView. Current scope homepage only, no full subpage or transaction flow.

## Founder decisions
- One real-estate marketplace for Haiti and Dominican Republic, both visible by default; sale/rent discovery, sell via provider onboarding. Not Stayz accommodation.
- Espresso #3B2F2F, Sand #F3E8D0; frozen HTML V17 SHA256 0fcddb2df9cd49369f586b7a2d6d444a1dc3c342c6b5d3401a97dffb0fe263de. Existing layout/photography/typography; no UI redesign; borders <=0.5 logical px. No rail shadow/overlay/counter/arrows.
- Map/hybrid/list share exact filtered results; 13 matching panorama properties max, full results remain accessible. Slow 18 dp/s autoplay, stop on finger contact (next frame), stationary hold no drift, follow drag, resume after release, infinite in either direction. Physical iOS/Android tests required.
- Default homepage: compact translucent header, search/filters, map with floating cards, five photo types (studio included in apartment), conditional Continue, Featured, Recently listed, Virtual tours, Rent, Land, Commercial, location groups, slim List your property, exact disclaimer “Listings are provided by owners and agents; this doesn't certify title.” Bottom nav Explore/Saved/Visits/Inquiries/Me; shared floating Quick Menu.
- Active search hides unrelated curated rows; default curation distinct from first three map IDs, per frozen V17. Adaptive land (plot area/survey, no bedrooms), commercial (floor area/no bedrooms), residential (floor area/bedrooms); canonical m², all ten units, preserve actual original declared area, no invented verification.
- Wantiss controls language and currency, never add a Habita currency picker/FX system. Read actual host setting/service; don't invent rates. Use original currency when no authorized conversion available.
- Historic pitch: $17/mo 1–4 listings, $24/mo 4+ (four-listing overlap unresolved), first 200 eligible customers three months free, OTP abuse prevention. No approved property transaction commission. No billing changes in this phase.

## Current integration
Consumer baseline 4257770ee17eb20687b1a4870e9ac7509b6d0750. Admin baseline 686069c54861ae626bd629c28c0b4963a35104a2. Branch habita/native-homepage-v17. Fixture records illustrative; route dev-only; live data not yet available. Native maps, filter/search/geo/canonical units, local user-scoped saved/recent/unit storage, UI-thread panorama initial implementation. Do not merge without acceptance.

To import original assets from the frozen source run from repository root:
```sh
node scripts/import-habita-v17.cjs /path/to/Habita_Homepage_V17.html
node --test tests/habita-homepage.test.cjs
```
Importer requires exact source checksum and writes 27 original photos + manifest + media.ts. All 27 reference JPEGs are committed as native bundled assets; the manifest records each original SHA-256. Do not substitute stock images. Tests cover pure state, not device gestures. Native device rendering and side-by-side screenshots remain OPEN.

## Acceptance gate
Reference screenshots at 320×740,390×844,430×932. At 390: map stage 700 high, search 39 high, rail width 302.59 per card, photo 150, radius13, price24, section pad17, heading22, bottom nav70.5, quick button33. Compare screenshots at matched logical content bounds, full page and each mode/filter/sheet, overlay and pixel-diff, account for status bars and live map provider differences only. No unexplained design drift. Verify 48 distinct fixtures (28 sale,20 rent), all 10 unit conversions, invalid inputs, geographic persistence, map/pin/rail sync, empty state and all navigation. Real iPhone/Android 20 repeated holds/swipes, 18 dp/s ±2, contact by next frame, zero hold drift for 3s/10s, manual drag, reverse loop, release, multitouch/cancellation, background/return/vertical scroll/reduced motion. No HTML preview substitutes.
 
## Backend / CMS
Read-only live database inspection found profiles, user_settings and shared wantiss_cms_content/assets, no Habita/property-named tables. Public CMS function serves latest published version for requested locale. No live database mutation. Integrate existing permissioned content pipeline; draft isolation, all editable copy/media, language and preview/refresh verification; production marketplace needs an approved listing data projection and own-account policies. Fixture data must never be published. 

## Later pages (not started)
Full details/gallery/tours, owner/agent profile, Saved comparison, Visits, Inquiries, Me, provider listing/subscription/OTP management, verification and admin operations. Trusted row only after verification policy approved. Production billing, transaction commissions, title certification and legal rules unresolved. Keep original detailed founder README and consolidated specification in the integration pack as source of authority.

## Integration checkpoint (28 November 2026)
- V17 fixture data re-extracted from HTML, independently compared using canonical JSON checksum 84d35d42 (FNV-1a); 48 exact records match. All 27 original photographs are committed in assets/ and registered in media.ts. Each Git blob SHA matches the original local file byte-for-byte. A regression test checks all asset hashes, sizes and registry entries.
- Shared published CMS key habita.home, copy and category/location imagery; same contract in paired admin branch habita/homepage-cms-v17. Shared account language and preferred currency read. No independent FX; until host provides a verified shared conversion, original USD prices remain explicitly identified. Locale translations and content publication/refresh tests remain open.
- Native screen builds and visual diff still not verified. The branch is development-only, no production data fallback, no main merge. Live database unchanged.
