export type PrezoThemeMode = 'light' | 'dark';

export type CampaignMode = 'group' | 'preorder';

export type CampaignStatus =
  | 'live'
  | 'upcoming'
  | 'successful'
  | 'failed'
  | 'paused'
  | 'soldout'
  | 'ended'
  | 'withdrawn'
  | 'unavailable';

export type FulfilmentMethod = 'delivery' | 'pickup' | 'digital' | 'service';

export type GroupMetricKind = 'buyers' | 'units' | 'revenue';

export interface ServiceSlot {
  id: string;
  label: string;
}

export interface CampaignBase {
  id: string;
  title: string;
  sellerId: string;
  category: string;
  description: string;
  images: string[];
  status: CampaignStatus;
  addedAt: number;
  featured: boolean;
  waitlistEnabled: boolean;
  price: number;
  opensAt: number | null;
  closesAt: number | null;
  fulfilmentAt: number | null;
  fulfilmentMethods: FulfilmentMethod[];
  optionValues: string[];
  maxPerOrder: number;
  deliveryFee: number;
  pickupInstructions: string | null;
  serviceSlots: ServiceSlot[];
  digitalDeliveryNote: string | null;
  shareUrl: string | null;
  cancellableUntil: number | null;
}

export interface GroupMetric {
  kind: GroupMetricKind;
  target: number;
  progress: number;
}

export interface GroupCampaign extends CampaignBase {
  mode: 'group';
  closesAt: number;
  fallbackPrice: number;
  fallbackWindowDays: number | null;
  metric: GroupMetric;
}

export interface PreorderStock {
  total: number;
  claimed: number;
}

export interface PreorderCampaign extends CampaignBase {
  mode: 'preorder';
  fulfilmentAt: number;
  stock: PreorderStock | null;
}

export type Campaign = GroupCampaign | PreorderCampaign;

export interface Seller {
  id: string;
  name: string;
  description: string;
}

export type OrderOutcome = 'active' | 'success' | 'failed' | 'cancelled';

export type FallbackDecision = 'pending' | 'accepted' | 'declined';

export type FallbackState = 'open' | 'accepted' | 'declined' | 'expired' | 'honored';

export interface SellerCommitment {
  valid: boolean;
  available: boolean;
}

export interface FallbackTerms {
  failedAt: number;
  decideBy: number;
  originalUnitPrice: number;
  fallbackUnitPrice: number;
  reached: number;
  target: number;
  metricKind: GroupMetricKind;
  sellerCommitment: SellerCommitment | null;
}

export type RefundStatus = 'requested' | 'processing' | 'completed' | 'failed';

export interface Refund {
  reference: string;
  status: RefundStatus;
  amount: number;
  updates: number[];
}

export interface AdditionalPayment {
  reference: string;
  amount: number;
  paidAt: number;
}

export interface Order {
  id: string;
  campaignId: string;
  mode: CampaignMode;
  campaignTitle: string;
  sellerId: string;
  category: string;
  imageUrl: string | null;
  quantity: number;
  option: string | null;
  fulfilment: FulfilmentMethod;
  unitPrice: number;
  amountPaid: number;
  placedAt: number;
  outcome: OrderOutcome;
  fulfilmentStatus: string;
  paymentReference: string;
  scheduledFor: number | null;
  fallback: FallbackTerms | null;
  fallbackDecision: FallbackDecision;
  refund: Refund | null;
  additionalPayment: AdditionalPayment | null;
}

export type WaitlistStatus =
  | 'active'
  | 'offer'
  | 'joined'
  | 'expired'
  | 'cancelled'
  | 'unavailable'
  | 'error';

export type NotificationChannel = 'Email' | 'Push' | 'None';

export interface WaitlistEntry {
  id: string;
  campaignId: string;
  campaignTitle: string;
  sellerId: string;
  category: string;
  imageUrl: string | null;
  joinedAt: number;
  status: WaitlistStatus;
  channel: NotificationChannel;
  offerExpiresAt: number | null;
}

export type MyPrezoTab = 'overview' | 'active' | 'success' | 'failed' | 'orders' | 'wl' | 'saved';

export type PrezoRoute =
  | { name: 'home' }
  | { name: 'explore'; category: string | null }
  | { name: 'me'; tab: MyPrezoTab }
  | { name: 'profile' }
  | { name: 'campaign'; id: string }
  | { name: 'seller'; id: string }
  | { name: 'checkout'; campaignId: string; waitlistEntryId: string | null }
  | { name: 'confirmation'; orderId: string }
  | { name: 'order'; id: string }
  | { name: 'fallback'; orderId: string }
  | { name: 'waitlistEntry'; id: string }
  | { name: 'alerts' }
  | { name: 'alert'; id: string }
  | { name: 'help' }
  | { name: 'faq'; topic: string }
  | { name: 'report'; relatedId: string | null }
  | { name: 'support' }
  | { name: 'policy'; topic: string };

export type PrezoAlertKind = 'wl' | 'ord' | 'prog';

export interface PrezoAlert {
  id: string;
  kind: PrezoAlertKind;
  title: string;
  message: string;
  at: number;
  read: boolean;
  target: PrezoRoute | null;
}

export interface PaymentMethod {
  id: string;
  label: string;
  unavailableReason: string | null;
}

export type AddressSource = 'wantiss' | 'prezo';

export interface PrezoAddress {
  id: string;
  label: string;
  line: string;
  source: AddressSource;
  isDefault: boolean;
}

export interface PrezoProfile {
  name: string;
  email: string;
}

export interface NotificationPreferences {
  progress: boolean;
  waitlist: boolean;
  orders: boolean;
}

export interface PrezoPreferences {
  theme: PrezoThemeMode | null;
  paymentMethodId: string | null;
  recentSearches: string[];
  notifications: NotificationPreferences;
}

export type ReportCategory = 'Payment' | 'Fallback offer' | 'Refund' | 'Fulfilment' | 'Other';

export interface ReportInput {
  category: ReportCategory;
  relatedId: string | null;
  message: string;
}

export interface PolicyDocument {
  topic: string;
  title: string;
  body: string;
}

export interface PlaceOrderInput {
  campaignId: string;
  quantity: number;
  option: string | null;
  fulfilment: FulfilmentMethod;
  addressId: string | null;
  serviceSlotId: string | null;
  paymentMethodId: string;
  waitlistEntryId: string | null;
  termsAccepted: boolean;
}
