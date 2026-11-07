import type { Admission, EventPolicy, GatherzEvent } from '../../types/gatherz';
export type EventPhase = 'upcoming' | 'live' | 'past';
export const eventPhase = (e: GatherzEvent, now = Date.now()): EventPhase => {
  const start = Date.parse(e.startsAt), end = Date.parse(e.endsAt);
  return now >= end ? 'past' : now >= start ? 'live' : 'upcoming';
};
const dayKey = (tz: string, t: number) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(t));
/** Event-local date and time. "Today" and "Tomorrow" are computed in the event's timezone. */
export function formatWhen(e: GatherzEvent, now = Date.now()): string {
  const tz = e.timezone, start = Date.parse(e.startsAt);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o }).format(new Date(start));
  const d = dayKey(tz, start) === dayKey(tz, now) ? 'Today' : dayKey(tz, start) === dayKey(tz, now + 864e5) ? 'Tomorrow' : f({ weekday: 'short', month: 'short', day: 'numeric' });
  return `${d} · ${f({ hour: 'numeric', minute: '2-digit' })}`;
}
export const DEFAULT_POLICY: EventPolicy = { admission: 'qr', age: 'All ages', transferCutoffHours: 2, refundCutoffHours: 48, reentry: 'Re-entry with wristband until 1 hour before close' };
export const policyOf = (e: GatherzEvent): EventPolicy => ({ ...DEFAULT_POLICY, ...e.policy });
export const admissionText = (p: EventPolicy) => p.admission === 'qr' ? 'Standard QR entry. No name or ID is collected.' : p.admission === 'named' ? 'Named admission. The attendee name is entered at checkout.' : `ID check at the door (${p.age}). Gatherz does not collect or store ID documents.`;
export interface TicketRow { admission: Admission; event: GatherzEvent }
/** Chronology comes from the event time, status from the admission. Transferred-away admissions are not shown as owned. */
export function splitAdmissions(list: Admission[], events: GatherzEvent[], now = Date.now()) {
  const byId = new Map(events.map(e => [e.id, e]));
  const upcoming: TicketRow[] = [], past: TicketRow[] = [];
  for (const a of list) {
    const event = byId.get(a.eventId);
    if (!event || a.status === 'transferred') continue;
    (eventPhase(event, now) === 'past' ? past : upcoming).push({ admission: a, event });
  }
  return { upcoming, past };
}
export const qrPayload = (a: Admission) => `GATHERZ-DEMO|NOT-VALID-FOR-ENTRY|${a.credentialCode}`;