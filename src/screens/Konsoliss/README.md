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
