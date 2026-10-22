import type { PromoCode, PromoRule } from '../../types/glowz/provider';

export const PROMOS: Record<PromoCode, PromoRule> = {
 "GLOW10": {
  "type": "pct",
  "v": 10,
  "min": 0,
  "label": "10% off",
  "funded": "Platform"
 },
 "FIRST200": {
  "type": "flat",
  "v": 200,
  "min": 800,
  "label": "₱200 off first booking",
  "funded": "Platform"
 }
};
