export type EventCategory = 'Music' | 'Nightlife' | 'Culture' | 'Food' | 'Sports';
export type AdmissionMode = 'qr' | 'named' | 'id';
export type TierKey = 'general' | 'vip' | 'backstage';
export type AdmissionStatus = 'valid' | 'pending_transfer' | 'transferred' | 'checked_in' | 'refunded' | 'canceled' | 'expired';
export interface EventPolicy { admission: AdmissionMode; age: string; transferCutoffHours: number; refundCutoffHours: number; reentry: string }
export interface GatherzTier { key: TierKey; name: string; price: number; admissions: number }
export interface GatherzEvent {
  id: string; title: string; tagline: string; category: EventCategory; venue: string; area: string;
  startsAt: string; endsAt: string; timezone: string; remaining: number; organizerName: string; art: number;
  tiers: GatherzTier[]; policy?: Partial<EventPolicy>;
}
export interface Admission { id: string; eventId: string; tier: TierKey; orderId: string; ownerId: string; status: AdmissionStatus; credentialCode: string; holderName?: string }
export interface GatherzRepository {
  readonly mode: 'demo' | 'live';
  listEvents(): Promise<GatherzEvent[]>;
  getEvent(id: string): Promise<GatherzEvent | null>;
  listMyAdmissions(): Promise<Admission[]>;
}