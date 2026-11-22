# Konsoliss — Implementation and Design Handoff

> Scope: Konsoliss within `momojdy/tiss_tiss_beta`. This is a compact project-context record based on available conversation history and repository inspection on 2026-11-23. Historical requests are not proof that all features are completed.

## Product and capacity invariants

- Container type: **40HQ**, usable capacity **68 CBM**; the backend is the authority for actual occupancy.
- Minimum purchasable/loadable example: **0.02 CBM**. Preserve a dedicated demo container showing 0.02 CBM physically loaded.
- Loaded, allocated/reserved, inbound, sent, customer-loaded, other-customer-loaded and free volume are distinct concepts. Never conflate customer reservation with physical loading.
- `loadedCbm + freeCbm = capacityCbm`; `yourLoadedCbm + otherCargoCbm = loadedCbm`.
- Visual loaded and empty regions must reflect the *same real proportions* as the numbers, including a 99%-loaded / 1%-free case. Do not exaggerate the empty region to make it visible.
- Demo data is preview-only and must never be presented as verified live assignments. Missing live occupancy must not be replaced with invented values.

## Design history and requested corrections

1. Original container rendering: user preferred naturally separated cartons, with visible breathing room, not a solid compressed wall.
2. Container geometry/capacity: represent a 40HQ container; maintain accurate proportional fill and remaining volume.
3. Empty region: preserve a subtle transparent yellow empty-space overlay with a **red dotted outline**, scaled to the *actual* available volume, rather than stuck to a corner.
4. Separation: leave a **small visible gap between the loaded region and the empty-space overlay** so their boundaries are legible. This is a rendering-only gap, not an extra capacity deduction.
5. Carton labels: vary sticker positions naturally (top-left/right, middle, bottom, partial offset) and sizes (small/medium/modestly large), but avoid oversized stickers.
6. Smallest example: render 0.02 CBM without changing all carton sizes or degrading the original appearance.
7. Near-full example: at 99% fill, the geometry should read as 99% loaded, 1% empty; preserve the tiny true remainder and its red dotted boundary.
8. **Latest explicit request (2026-11-23):** restore the original natural carton spacing; stop cartons looking jammed together; keep a slight separation between loaded and empty areas; restore visible dotted red empty-space boundary; restore **numeric available-empty-space text** in the visualization. Keep that text synced with real occupancy and distinguish unverified live data.

## Current code locations (observed)

- `src/screens/Konsoliss/konsolissHomeScreen.tsx`: React Native home screen, WebView-based container visualization and occupancy UI. The packed-carton generation currently uses `smallSeam=.0006`, producing visually near-flush cartons. A separate React Native label above the WebView currently shows `{containerAvailable} CBM` available; the user's request to restore the available-space text *in the visual empty region* is not yet verified as implemented.
- `src/screens/Konsoliss/konsolissDemoContainers.ts`: preview scenarios including `KS-DEMO-09` with 0.02 CBM loaded, plus larger/near-full loads.
- `src/screens/Konsoliss/useKonsolissContainerOccupancy.ts`: Supabase RPC `konsoliss_container_occupancy`, checks 40HQ, 68 CBM, and arithmetic consistency; refreshes on foreground and every 30 seconds.
- `src/screens/Konsoliss/useKonsolissLoadProgress.ts`, `useKonsolissAssignedContainers.ts`, `useCurrentKonsolissContainer.ts`: separate load-progress and assigned-container data sources.
- `tests/konsoliss-lifecycle.test.cjs`: existing lifecycle test file.

## Implementation acceptance criteria

- Cartons show **natural, discernible gaps** in every demo and do not merge into a monolithic block. Restore the *original visual style* without faking cargo occupancy.
- Loaded/unloaded split is proportional to the CBM ratio. Gaps between individual cartons are visual seams only; their appearance must not imply that cargo volume is substantially lower than reported.
- The yellow translucent free-space volume and red dotted boundary remain visible at 0%, intermediate, 99%, and 100% loads when applicable. At 100% there is no free-volume box to outline.
- The free-space overlay tracks the true remaining geometry, not a fixed corner-sized marker. A subtle offset from the cargo boundary makes the delineation readable without changing numeric capacity.
- Show remaining **CBM** numerically in the container visualization or immediately attached to the empty region; for live unavailable/unverified values show an explicit unavailable state, not a fabricated number.
- Random-looking carton sticker positions/sizes are deterministic enough not to flicker on re-render and never overwhelm the carton faces.
- Confirm demo cases: 0, 0.02, 8.4, 18.7, 31.5, 48.2, 54.3, 62.1, 67.2 and a targeted 99% of 68 CBM test.
- Test WebView on supported devices and verify the visual appearance, rather than relying solely on source inspection.

## Status and next work

This document records the design contract and the inspected architecture. **It does not assert that the latest spacing, dotted-border, in-visual available-space-label, or device-rendering corrections have been completed or tested.** Implement those changes in the WebView renderer, compare against the earliest original carton style, run automated checks, and validate screenshots at several fill percentages before marking complete.

## 2026-11-23 renderer adjustment

Commit `9ba7fa0246841541ac19bb7d8079009814241e02` increases packed-carton visual seams from `0.0006` to `0.018` renderer units, reduces the largest sticker sizes, adds a subtle capped gap at the start of the free-space overlay, and keeps the free-CBM text within the canvas bounds. This is a source-level change; device screenshots, visual regression checks and runtime tests have **not** been completed. Check that the red dashed outline remains legible for near-full containers and that all visible seams match the desired original appearance.


## Recovered project history and source-of-truth decisions (2026-11-23)

The complete private/shared ChatGPT conversation at `chatgpt.com/g/g-p-692de74d23788191a229fa7b668fbcf9-wantiss-project/shared/c/6a97c033-3aa8-83ec-aab7-fddc27de7508` could not be read directly. The following is recovered from available Wantiss project conversation excerpts, repository code, and GitHub commit history; it is **not** a claim of having read every message or image from that link.

### Original screenshot contract

- Preserve the reference's horizontal red 40HQ container with individually distinguishable brown, tan, gray, and red cartons, naturally spaced; avoid solid, narrow vertical packed panels.
- The reference example shows **51.7 / 68 CBM** occupied (**76%**), **16.3 CBM** free, **51.2 CBM** other cargo, and **0.50 CBM** customer cargo. These numbers are an example only, not a live-data fallback.
- **`Your space 0.50 CBM`** belongs **above the container**, with a thin pointer to the customer's **red carton**. The numeric value must follow the selected container's customer physically loaded CBM, not reserved/inbound CBM.
- **`16.3 CBM free`** belongs **inside the yellow/translucent free-volume section**, with a red dotted/dashed outline. Its value must follow the selected container's free CBM.
- Both annotations must be legible **without floating React Native cards**, must remain visible during 3D rotation, and must explicitly show an unavailable state when data cannot be verified. Never silently omit them for zero or missing occupancy.
- All cartons should carry reasonably sized white shipping stickers, with deterministic varied positions/sizes. Small cargo can be rectangular/flat/tall, not forced into cubes; 0.02 CBM remains supported.
- Keep a small *visual* loaded/free separation, without changing the 68 CBM arithmetic. At 99% fill, loaded cargo must visually occupy ~99%, not leave a misleadingly large gap.

### Earlier implementation and regressions

- Historical renderer at `166830cdb5cfb9184c6fd7308653b5fabe665380` painted both CBM labels **on canvas** using `cx.fillText`; its free label used `cx.strokeText` for contrast. These were tied to projected 3D positions.
- `4cfd1583cd1e7a3dbe7d120063831e6d3f1a5da5` and `376d1277c05fc31555ac18ac42d59913620e2c6e` revised packing toward nearly full 99% occupancy, at the expense of carton breathing room.
- `9ba7fa0246841541ac19bb7d8079009814241e02` increased visual seams and retained the free-volume outline.
- `5e93686a193fd772cc125a1b3ef8c089ab9b1769` reduced packed columns and changed the customer's label wording.
- `11c7117631be83df026cdaf18e3fe23d2b5fb789` made packed carton sticker presence mandatory and adjusted tiny-cargo aspect ratios; **main packing remains grid-based** and is not yet a natural variable-size packing engine.
- `35b21dc6e8ce31990c29cffd17d37ceab0e17e90` adjusted canvas annotations; `fd98cb864d24230b2cfb350e0ff33c3f996a3a32` introduced native React Native overlay cards; `6432ef3253e18e956dd93ed70b9e0bbe012e1a0d` removed them. User repeatedly reported both labels invisible.
- `8e16ebef55aa4d9781bbfbafbbf24e66f624cec4` restores screenshot-style **HTML text annotations inside the WebView**, separate from canvas paint operations. The customer label is above the container and the free label is placed over the free-space area; when projected coordinates are available they are updated on draw. Numeric text is generated from the selected container occupancy; unavailable data is explicitly marked. The canvas annotation drawing remains as a fallback.

### Maintainability and acceptance workflow

After **every new Konsoliss logic change**, update this README in the **same work session**, documenting the invariant, implementation, test evidence, and commit. Do not mark screenshot matching or production readiness complete without device/browser render verification. Test at least: zero occupancy, 0.02 CBM, a mid-filled container, the reference's 51.7/68 example, 67.2/68, 99%, and full 68/68. Verify customer label, free label, 3D rotation, carton stickers, natural gaps, and red dashed free outline in light and dark themes.

**Current verification status:** GitHub source edits have been committed. Live device screenshot verification, 3D text placement across rotation, and complete automated tests have **not** been performed. Do not claim otherwise.


## Historical commit audit — rotation and labels (2026-11-23)

**Root regression:** The original `draw()` implementation painted customer/free labels **directly on the same canvas as the 3D container**, using `proj([x,y,z])` from the current `yaw`/`pitch`. This made the labels track the container as it rotated. The newer `8e16ebef...` change created DOM HTML labels with CSS positioning, duplicating canvas text; that changed their placement and could cause angle mismatch. The intervening `fd98cb864...` native overlay cards were also not part of the original design.

**Evidence from historical code:**
- `be719f979`, `c78400998`: customer callout projects the customer-carton anchor, draws a line and dot, and writes loaded-space CBM above the 3D model; free-space text projects a world-space free-volume center and uses `strokeText` plus `fillText`.
- `6102bf87b` and `291b86932`: free-space text uses `proj([freeRatio>0?(freeX0+innerX1)/2:innerX1-.12,1.3,0])`, keeping the text tied to the actual empty region as the view rotates.
- `166830cdb`: retains those canvas projections and the original small 10px free-space font, before later label and packing changes.
- `35b21dc6e` and `6432ef325`: repositioned/reworded the canvas annotations; `fd98cb864` and `8e16ebef` added UI/HTML overlays that did not preserve the original screenshot behavior.

**Correction:** `38beda54552e52ed9389ac09c74e9cfdcd0f6684` removes the HTML annotations and restores **one source of text rendering**: the historical 3D canvas projected anchors, line/dot pointer, compact typography, and contrast stroke. Both annotations are calculated on every draw, so they track the same yaw/pitch as the container. The free label is projected from the free region center; the customer label is projected from the customer's actual carton when available, otherwise from a calculated customer cargo position.

**Important data constraint:** Current UI passes `containerOccupancy?.capacityCbm??0`, `loadedCbm??0`, and `yourPhysicallyLoadedCbm??0` to the WebView. If the selected live container has **no verified occupancy** or the customer has **zero loaded CBM**, a numeric customer annotation cannot truthfully be shown. This is a data-state issue separate from the angle/position regression. Do not fabricate values to force a label.

**Unverified:** no simulator/device screenshots or runtime build results were obtained in this audit. The correction restores historical implementation logic, not yet a verified visual match. Test dragging yaw/pitch at 0.02, 51.7/68, and 67.2/68, confirming the label anchor and free region rotate together.

## Exact label-version selection (2026-11-23)

User explicitly selected the historical **`My current loaded space`** customer annotation and the **free-space text implementation from commit `6102bf87b`**, rather than newer `Your space` wording or HTML/native overlays. Commit `b18196603a8ab4f9ed17ece35bee7ce7c1119be3` changes the customer canvas label to `My current loaded space <loaded CBM> CBM` and restores the free annotation's exact `6102bf87b` projection, condition (`FREE >= 0` and `FREE <= 68`), font, halo stroke, and one-decimal `FREE.toFixed(1)+' CBM free'` formatting. Both remain inside the canvas draw function so rotation uses the same yaw/pitch as the container. Customer-carton anchor remains adapted to the newer packedCartons/miniature renderer rather than reverting unrelated geometry. Runtime/device verification still pending.
