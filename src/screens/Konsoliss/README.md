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
