import type {
  Campaign,
  NotificationChannel,
  Order,
  PaymentMethod,
  PlaceOrderInput,
  PolicyDocument,
  PrezoAddress,
  PrezoAlert,
  PrezoPreferences,
  PrezoProfile,
  ReportInput,
  Seller,
  WaitlistEntry,
} from '../../types/prezo';

export class PrezoRepositoryError extends Error {
  readonly code: 'unavailable' | 'rejected' | 'network';

  constructor(message: string, code: 'unavailable' | 'rejected' | 'network' = 'rejected') {
    super(message);
    this.name = 'PrezoRepositoryError';
    this.code = code;
  }
}

export interface PrezoAddressSource {
  list(): Promise<PrezoAddress[]>;
  add(input: { label: string; line: string }): Promise<PrezoAddress>;
}

export interface PrezoRepository {
  addresses: PrezoAddressSource;
  listCampaigns(): Promise<Campaign[]>;
  listSellers(): Promise<Seller[]>;
  listOrders(): Promise<Order[]>;
  listWaitlist(): Promise<WaitlistEntry[]>;
  listAlerts(): Promise<PrezoAlert[]>;
  listSavedCampaignIds(): Promise<string[]>;
  listPaymentMethods(): Promise<PaymentMethod[]>;
  getProfile(): Promise<PrezoProfile | null>;
  getPreferences(): Promise<PrezoPreferences>;
  updatePreferences(patch: Partial<PrezoPreferences>): Promise<PrezoPreferences>;
  setCampaignSaved(campaignId: string, saved: boolean): Promise<string[]>;
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  cancelOrder(orderId: string): Promise<Order>;
  acceptFallback(orderId: string, paymentMethodId: string): Promise<Order>;
  declineFallback(orderId: string): Promise<Order>;
  requestRefund(orderId: string): Promise<Order>;
  retryRefund(orderId: string): Promise<Order>;
  joinWaitlist(campaignId: string, channel: NotificationChannel): Promise<WaitlistEntry>;
  updateWaitlistChannel(entryId: string, channel: NotificationChannel): Promise<WaitlistEntry>;
  leaveWaitlist(entryId: string): Promise<WaitlistEntry>;
  markAlertRead(alertId: string): Promise<PrezoAlert[]>;
  markAllAlertsRead(): Promise<PrezoAlert[]>;
  submitReport(input: ReportInput): Promise<{ reference: string }>;
  getPolicy(topic: string): Promise<PolicyDocument | null>;
}

