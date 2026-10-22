const parseHex = (hex: string): [number, number, number] => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const mixColors = (top: string, bottom: string, topShare: number): string => {
  const [tr, tg, tb] = parseHex(top);
  const [br, bg, bb] = parseHex(bottom);
  const mix = (a: number, b: number) => Math.round(a * topShare + b * (1 - topShare));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(tr, br))}${toHex(mix(tg, bg))}${toHex(mix(tb, bb))}`;
};

