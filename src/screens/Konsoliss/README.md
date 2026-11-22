# Konsoliss 3D container visualization

## Visual requirements

40HQ container capacity is 68 CBM. Live loaded volume and free volume must use verified occupancy, never fabricated fallback values. The visual cargo boundary should follow LOADED/68 and the translucent yellow region with red dotted edges should follow FREE/68. A very narrow visual-only gap distinguishes cargo from the free region, without changing CBM arithmetic. Preserve natural seams between cartons, original brown/tan/red carton geometry, varied shipping stickers, and the historical projected `My current loaded space` and `X.X CBM free` canvas annotations restored from `c7840099888631cbd41a7fd0cf5095d53c140730`.

## 2026-11-23 geometry update

Commits `964128db809580ccabf26249eab8185a88d697c6` and `9250550fc82d1213196fad3c9e57efaf7676046c` map original carton coordinates across the usable interior dimensions and clip the displayed cartons to the verified loaded-volume x boundary, instead of showing a count of cartons that visually underfills 99%. The empty-space overlay uses FREE/68 and retains its red dashed boundary. The source carton coordinates are not mutated between draw calls. The original empty/demo animation is left on its original geometry. This is a volume-proportional illustration, not a verified real-world packing solution. Device/simulator rendering and visual checks at 0.02 CBM, 76%, 99%, 100%, and empty remain outstanding.

## Customer-owned red cargo and callout (2026-11-23)

Commit `1c92ba8756c155aa94c1ca4736e65867d8edb36a`: count only actually visible non-pallet cartons after loaded-boundary clipping, then select the customer's proportional share of those visible cartons and render them red. Track the transformed position of the last customer-owned visible carton and project `My current loaded space <CBM> CBM` to that red carton, not an untransformed original carton or a clipped-out carton. For very small loads the miniature red parcel anchor is preferred. Other customers' cartons keep their original colors. This does not invent ownership when verified `YOUR_LOADED` is zero. Device screenshot validation remains pending.

## Expandable customer load summary (2026-11-23)

Commit `44080ca27a2ba843f3c67cb26d2bf9a256197c73` makes the top-left current load summary a clickable accessible button with an expand/collapse chevron. The compact value is verified `(physically loaded + inbound to container) / purchased CBM`, with the loaded and inbound portions shown separately. Expanded details show purchased, goods sent, physically loaded, inbound to container, loaded + inbound, at warehouse or still in transit, purchased space not yet sent, and purchased space not yet allocated. These values come from `useKonsolissLoadProgress` and the backend `konsoliss_customer_load_progress` record; missing/unverified values remain em dashes, not invented zeros. This dropdown is distinct from the 3D canvas carton callout. Device rendering has not yet been verified.

## Live Supabase customer load breakdown (2026-11-23)

The live Wantiss Supabase project (`ycbirmgppwavorwudlrv`) has the existing RLS-protected source table `public.konsoliss_customer_load_progress` (one row per authenticated customer), with server-maintained `reserved_cbm`, `sent_cbm`, `loaded_cbm`, and `inbound_to_container_cbm`. A new migration `konsoliss_customer_load_breakdown_secure_view` creates `public.konsoliss_customer_load_breakdown` as a **security-invoker view**, so underlying per-user RLS remains in force. Only authenticated users have SELECT on the view; anonymous access is revoked. The consumer hook `useKonsolissLoadProgress` now reads this view.

The view exposes:
- `allocated_cbm = loaded_cbm + inbound_to_container_cbm`
- `at_warehouse_or_in_transit_cbm = greatest(0, sent_cbm - loaded_cbm - inbound_to_container_cbm)`
- `reserved_not_sent_cbm = greatest(0, reserved_cbm - sent_cbm)`
- `not_allocated_cbm = greatest(0, reserved_cbm - loaded_cbm - inbound_to_container_cbm)`
- `allocated_percent = round(100 * allocated_cbm / reserved_cbm, 2)`, or zero when no space is purchased.

Database constraints already enforce nonnegative volumes and `loaded + inbound <= sent` and `loaded + inbound <= reserved`. The app still independently computes the same derived fields from source values for backwards-compatible UI semantics; it requests the backend-derived columns as well. No test/customer records or fake CBM values were inserted into Supabase. The temporary **DEMO** numbers in the UI are presentation-only and must be removed before production release.

**Verification:** Migration applied successfully; read-back confirmed `security_invoker=true`, source-table RLS enabled, authenticated SELECT allowed and anon SELECT denied. The source table currently contains **zero rows**, so end-to-end verification with a real customer shipment remains outstanding. The combined warehouse/in-transit category cannot distinguish those two physical states until separate verified event data exists. The frontend must not infer that a customer has left the warehouse from a booking alone.

## Konsoliss universal three-dot quick menu (updated 2026-11-23)

### Persistent trigger and appearance

The quick-menu trigger in `konsolissHomeScreen.tsx` is an **absolute-positioned overlay outside the ScrollView**, so it stays on screen during scrolling, as in Goodies. It sits slightly lower than the header content (`top: insets.top + 198`, `right: 18`), has a compact red pill background, and uses three horizontally arranged dots of 5, 7, and 10 pixels with 3-pixel gaps. Pressing it opens `KonsolissQuickMenu.tsx`. The trigger is no longer embedded below the available-CBM text inside scrolling content. Do not regress its fixed positioning. This is UI-only and must not change the 3D container model or occupancy math.

### Popup layout and actions

The bottom sheet follows the **Goodies and Gatherz quick-menu pattern**: a top row of Home, Messages, Notifications, Wallet, Saved; a horizontally scrollable lower row of My Orders, Recent Activity, Help Center, Feedback, Business Space, Dark Mode; backdrop dismissal and Cancel. Menu action icons use `ThinMenuIcon` **directly on the sheet**, without the extra rounded tile backgrounds/borders that were removed. The Home slot uses the same remote Wantiss logo URL as Goodies, displays a `Home` label, and falls back to a letter **W** if image loading fails. This fallback does **not** prove that the actual remote logo loads successfully; verify on device. Only the Home logo retains a circular image frame.

The popup uses Konsoliss cream/red styling in light mode and a darker palette in dark mode. Dark Mode toggles the **Konsoliss screen's own theme**, with the override saved in AsyncStorage under `konsoliss.theme`; without an override it follows the system appearance. This does not necessarily change the global Goodies/Gatherz theme.

### Universal notification/message badge colors — critical invariant

**Yellow (`#DDB52B`) is reserved for Konsoliss-originated unread items, not for all badges displayed while the user is in Konsoliss.** The quick menu now follows the feature-origin color logic of Goodies/Gatherz, rather than assigning yellow unconditionally.

On opening the popup, `KonsolissQuickMenu.tsx` uses the authenticated Supabase user to load unread `notifications.feature_name` and unread messages from `conversations.feature_name` joined via unread `messages.conversation_id`. It subscribes to changes in the notifications and messages tables while open, then unsubscribes on close. Feature-to-color mapping:

| Originating feature | Color |
| --- | --- |
| Goodies | `#FD802E` |
| Gatherz | `#A36BE8` |
| Flyz | `#4A67B0` |
| Wallet | `#81C56C` |
| Frenzies | `#B3DF4B` |
| **Konsoliss** | **`#DDB52B`** |
| Woulib | `#FEC509` |
| Stayz | `#579BC7` |
| Glowz | `#D49E2B` |
| Unknown/other | `#BD279F` |

The current menu uses the **first distinct unread feature color** for each of its two aggregate badges (Notifications and Messages), falling back to magenta when no matching origin is available. It does **not** simultaneously display every origin color or rotate colors when several features have unread items; this remains a possible parity improvement against Gatherz. The numeric unread counts are supplied by the parent screen, not recomputed from these color queries, so confirm their scope matches the displayed color metadata in end-to-end QA. Never infer that all unread items belong to Konsoliss merely because this popup was opened from Konsoliss.

### Navigation and known limitations

Host navigation in `App.tsx` routes Home, Messages, Notifications, Wallet, Saved, Recent Activity, and Business Space to shared Wantiss destinations. My Orders currently falls back to universal activity because a dedicated Konsoliss orders route has not been implemented; Help and Feedback temporarily open existing Goodies support/contact routes, not a Konsoliss-specific support workflow. Do not represent those destinations as feature-complete.

The shared Saved screen accepts `preferredFeature`. When entered from Konsoliss, it displays a Konsoliss section **before** Goodies and other collections, without fabricating saved items or counts; when entered from Goodies, its existing Goodies-first order remains. A real Konsoliss save/persistence feature has not yet been built, so this section explicitly indicates no saved items are available. Returning from Saved goes back to the originating feature.

**Verification still needed:** device/simulator visual QA of the persistent trigger, popup spacing and Home logo load/fallback; theme persistence after app restart; live Supabase unread notification/message counts and mixed-feature badge colors; navigation destinations and accessibility; final production builds. Code commits alone do not establish device-level correctness.
