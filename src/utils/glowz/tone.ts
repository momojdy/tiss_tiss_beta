/** Which of the four illustration palettes (0 to 3) a hue key uses. */
const TONE: Record<number, number> = {
  335: 0, 350: 3, 8: 0, 285: 1, 25: 3, 160: 2, 215: 1, 185: 2, 35: 3, 340: 0, 290: 1, 15: 0, 165: 2, 210: 1,
};

export function toneOf(h: number): number {
  return TONE[h] !== undefined ? TONE[h] : Math.floor(h / 37) % 4;
}
