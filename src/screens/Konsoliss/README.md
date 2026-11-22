# Konsoliss 3D container visualization

## Visual requirements

40HQ container capacity is 68 CBM. Live loaded volume and free volume must use verified occupancy, never fabricated fallback values. The visual cargo boundary should follow LOADED/68 and the translucent yellow region with red dotted edges should follow FREE/68. A very narrow visual-only gap distinguishes cargo from the free region, without changing CBM arithmetic. Preserve natural seams between cartons, original brown/tan/red carton geometry, varied shipping stickers, and the historical projected `My current loaded space` and `X.X CBM free` canvas annotations restored from `c7840099888631cbd41a7fd0cf5095d53c140730`.

## 2026-11-23 geometry update

Commits `964128db809580ccabf26249eab8185a88d697c6` and `9250550fc82d1213196fad3c9e57efaf7676046c` map original carton coordinates across the usable interior dimensions and clip the displayed cartons to the verified loaded-volume x boundary, instead of showing a count of cartons that visually underfills 99%. The empty-space overlay uses FREE/68 and retains its red dashed boundary. The source carton coordinates are not mutated between draw calls. The original empty/demo animation is left on its original geometry. This is a volume-proportional illustration, not a verified real-world packing solution. Device/simulator rendering and visual checks at 0.02 CBM, 76%, 99%, 100%, and empty remain outstanding.

## Customer-owned red cargo and callout (2026-11-23)

Commit `1c92ba8756c155aa94c1ca4736e65867d8edb36a`: count only actually visible non-pallet cartons after loaded-boundary clipping, then select the customer's proportional share of those visible cartons and render them red. Track the transformed position of the last customer-owned visible carton and project `My current loaded space <CBM> CBM` to that red carton, not an untransformed original carton or a clipped-out carton. For very small loads the miniature red parcel anchor is preferred. Other customers' cartons keep their original colors. This does not invent ownership when verified `YOUR_LOADED` is zero. Device screenshot validation remains pending.
