/** Demo clock. The prototype pretends it is 10:00 so today always has bookable slots. */
export const DEMO_MIN = 10 * 60;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function today(): Date {
  return startOfDay(new Date());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}