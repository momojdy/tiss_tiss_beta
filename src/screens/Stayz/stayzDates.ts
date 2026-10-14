export const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toISO(new Date());

export const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const diffDays = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);

export const combine = (date: string, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = fromISO(date);
  d.setHours(h, m || 0, 0, 0);
  return d;
};

export const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3600000;

export const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600000);

export const fmtDate = (s: string) => fromISO(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtLongDate = (s: string) => fromISO(s).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m || 0)} ${h < 12 ? 'AM' : 'PM'}`;
};

export const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${fmtTime(`${d.getHours()}:${d.getMinutes()}`)}`;
};

export const fmtMonth = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const monthCells = (year: number, month: number) => {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(toISO(new Date(year, month, d)));
  return cells;
};

export const addBusinessDays = (d: Date, n: number) => {
  const r = new Date(d);
  let left = n;
  while (left > 0) {
    r.setDate(r.getDate() + 1);
    const w = r.getDay();
    if (w !== 0 && w !== 6) left--;
  }
  return r;
};

export const hourSlots = (from: string, until: string) => {
  const a = Number(from.split(':')[0]);
  const b = Number(until.split(':')[0]);
  const out: string[] = [];
  for (let h = a; h < b; h++) out.push(`${pad(h)}:00`);
  return out;
};
