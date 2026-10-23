export type GlyphShape =
  | { kind: 'path'; d: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

const p = (d: string): GlyphShape => ({ kind: 'path', d });
const rect = (x: number, y: number, width: number, height: number, rx: number): GlyphShape => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
  rx,
});
const circle = (cx: number, cy: number, r: number): GlyphShape => ({ kind: 'circle', cx, cy, r });

export const categoryGlyphs: Record<string, GlyphShape[]> = {
  Audio: [p('M14 36v-6a16 16 0 0132 0v6'), rect(10, 35, 9, 14, 4), rect(41, 35, 9, 14, 4)],
  Bags: [p('M13 24h34l-3 25H16z'), p('M22 24c0-13 16-13 16 0')],
  Classes: [p('M24 12h12M26 12c0 8-9 10-9 22 0 9 6 14 13 14s13-5 13-14c0-12-9-14-9-22')],
  Home: [p('M18 50h24M30 50V30M30 30L18 14h18l8 8'), circle(44, 26, 3)],
  Digital: [rect(12, 14, 36, 32, 3), p('M12 38l10-10 8 8 6-6 12 12'), circle(38, 24, 3)],
  Jewellery: [circle(30, 38, 12), p('M23 22l4-8h6l4 8-7 5z')],
  Apparel: [p('M22 12l-12 8 5 9 6-3v22h18V26l6 3 5-9-12-8c-2 5-8 5-10 0z')],
  Food: [
    p('M14 26h26v12a10 10 0 01-10 10h-6a10 10 0 01-10-10z'),
    p('M40 30h4a5 5 0 010 10h-4M22 12c0 4 4 4 0 8M30 12c0 4 4 4 0 8'),
  ],
};

export const fallbackGlyph: GlyphShape[] = [circle(30, 30, 14)];

