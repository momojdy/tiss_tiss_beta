import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PrezoRepository } from '../../data/prezo/PrezoRepository';
import type {
  Campaign,
  NotificationChannel,
  NotificationPreferences,
  Order,
  PaymentMethod,
  PlaceOrderInput,
  PolicyDocument,
  PrezoAddress,
  PrezoAlert,
  PrezoPreferences,
  PrezoProfile,
  PrezoThemeMode,
  ReportInput,
  Seller,
  WaitlistEntry,
} from '../../types/prezo';

export interface Resource<T> {
  status: 'loading' | 'ready' | 'error';
  data: T;
  message: string | null;
}

const pending = <T>(data: T): Resource<T> => ({ status: 'loading', data, message: null });

const describeError = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.';

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((entry) => entry.id === item.id)
    ? list.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...list];

const defaultPreferences: PrezoPreferences = {
  theme: null,
  paymentMethodId: null,
  recentSearches: [],
  notifications: { progress: true, waitlist: true, orders: true },
};

type ResourceKey =
  | 'campaigns'
  | 'sellers'
  | 'orders'
  | 'waitlist'
  | 'alerts'
  | 'saved'
  | 'paymentMethods'
  | 'addresses'
  | 'profile'
  | 'preferences';

export interface PrezoStore {
  campaigns: Resource<Campaign[]>;
  sellers: Resource<Seller[]>;
  orders: Resource<Order[]>;
  waitlist: Resource<WaitlistEntry[]>;
  alerts: Resource<PrezoAlert[]>;
  saved: Resource<string[]>;
  paymentMethods: Resource<PaymentMethod[]>;
  addresses: Resource<PrezoAddress[]>;
  profile: Resource<PrezoProfile | null>;
  preferences: Resource<PrezoPreferences>;
  selectedPaymentMethodId: string | null;
  unreadAlertCount: number;
  openWaitlistOfferCount: (now: number) => number;
  getCampaign: (id: string) => Campaign | null;
  getSeller: (id: string) => Seller | null;
  getOrder: (id: string) => Order | null;
  getWaitlistEntry: (id: string) => WaitlistEntry | null;
  getAlert: (id: string) => PrezoAlert | null;
  reload: (keys?: ResourceKey[]) => Promise<void>;
  toggleSaved: (campaignId: string) => Promise<boolean>;
  placeOrder: (input: PlaceOrderInput) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<Order>;
  acceptFallback: (orderId: string, paymentMethodId: string) => Promise<Order>;
  declineFallback: (orderId: string) => Promise<Order>;
  requestRefund: (orderId: string) => Promise<Order>;
  retryRefund: (orderId: string) => Promise<Order>;
  joinWaitlist: (campaignId: string, channel: NotificationChannel) => Promise<WaitlistEntry>;
  updateWaitlistChannel: (entryId: string, channel: NotificationChannel) => Promise<WaitlistEntry>;
  leaveWaitlist: (entryId: string) => Promise<WaitlistEntry>;
  markAlertRead: (alertId: string) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
  addAddress: (input: { label: string; line: string }) => Promise<PrezoAddress>;
  selectPaymentMethod: (id: string) => void;
  setNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  persistTheme: (mode: PrezoThemeMode) => void;
  rememberSearch: (query: string) => void;
  submitReport: (input: ReportInput) => Promise<{ reference: string }>;
  loadPolicy: (topic: string) => Promise<PolicyDocument | null>;
}

export const usePrezoStore = (repository: PrezoRepository): PrezoStore => {
  const [campaigns, setCampaigns] = useState<Resource<Campaign[]>>(pending([]));
  const [sellers, setSellers] = useState<Resource<Seller[]>>(pending([]));
  const [orders, setOrders] = useState<Resource<Order[]>>(pending([]));
  const [waitlist, setWaitlist] = useState<Resource<WaitlistEntry[]>>(pending([]));
  const [alerts, setAlerts] = useState<Resource<PrezoAlert[]>>(pending([]));
  const [saved, setSaved] = useState<Resource<string[]>>(pending([]));
  const [paymentMethods, setPaymentMethods] = useState<Resource<PaymentMethod[]>>(pending([]));
  const [addresses, setAddresses] = useState<Resource<PrezoAddress[]>>(pending([]));
  const [profile, setProfile] = useState<Resource<PrezoProfile | null>>(pending(null));
  const [preferences, setPreferences] = useState<Resource<PrezoPreferences>>(
    pending(defaultPreferences),
  );
  const [chosenPaymentMethodId, setChosenPaymentMethodId] = useState<string | null>(null);
  const preferencesRef = useRef<PrezoPreferences>(defaultPreferences);
  preferencesRef.current = preferences.data;

  const run = useCallback(
    async <T,>(
      fetcher: () => Promise<T>,
      setter: Dispatch<SetStateAction<Resource<T>>>,
      quiet: boolean,
    ) => {
      if (!quiet) setter((prev) => ({ ...prev, status: 'loading', message: null }));
      try {
        const data = await fetcher();
        setter({ status: 'ready', data, message: null });
      } catch (error) {
        setter((prev) => ({ ...prev, status: 'error', message: describeError(error) }));
      }
    },
    [],
  );

  const reload = useCallback(
    async (keys?: ResourceKey[]) => {
      const all: ResourceKey[] = [
        'campaigns',
        'sellers',
        'orders',
        'waitlist',
        'alerts',
        'saved',
        'paymentMethods',
        'addresses',
        'profile',
        'preferences',
      ];
      const targets = keys ?? all;
      const quiet = !!keys;
      const jobs: Record<ResourceKey, () => Promise<void>> = {
        campaigns: () => run(() => repository.listCampaigns(), setCampaigns, quiet),
        sellers: () => run(() => repository.listSellers(), setSellers, quiet),
        orders: () => run(() => repository.listOrders(), setOrders, quiet),
        waitlist: () => run(() => repository.listWaitlist(), setWaitlist, quiet),
        alerts: () => run(() => repository.listAlerts(), setAlerts, quiet),
        saved: () => run(() => repository.listSavedCampaignIds(), setSaved, quiet),
        paymentMethods: () => run(() => repository.listPaymentMethods(), setPaymentMethods, quiet),
        addresses: () => run(() => repository.addresses.list(), setAddresses, quiet),
        profile: () => run(() => repository.getProfile(), setProfile, quiet),
        preferences: () => run(() => repository.getPreferences(), setPreferences, quiet),
      };
      await Promise.all(targets.map((key) => jobs[key]()));
    },
    [repository, run],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (preferences.status === 'ready') {
      setChosenPaymentMethodId(preferences.data.paymentMethodId);
    }
  }, [preferences.status, preferences.data.paymentMethodId]);

  const campaignMap = useMemo(
    () => new Map(campaigns.data.map((campaign) => [campaign.id, campaign])),
    [campaigns.data],
  );
  const sellerMap = useMemo(
    () => new Map(sellers.data.map((seller) => [seller.id, seller])),
    [sellers.data],
  );

  const getCampaign = useCallback((id: string) => campaignMap.get(id) ?? null, [campaignMap]);
  const getSeller = useCallback((id: string) => sellerMap.get(id) ?? null, [sellerMap]);
  const getOrder = useCallback(
    (id: string) => orders.data.find((order) => order.id === id) ?? null,
    [orders.data],
  );
  const getWaitlistEntry = useCallback(
    (id: string) => waitlist.data.find((entry) => entry.id === id) ?? null,
    [waitlist.data],
  );
  const getAlert = useCallback(
    (id: string) => alerts.data.find((alert) => alert.id === id) ?? null,
    [alerts.data],
  );

  const refreshAfterOrderChange = useCallback(
    () => reload(['campaigns', 'orders', 'waitlist', 'alerts']),
    [reload],
  );

  const toggleSaved = useCallback(
    async (campaignId: string) => {
      const next = !saved.data.includes(campaignId);
      const ids = await repository.setCampaignSaved(campaignId, next);
      setSaved({ status: 'ready', data: ids, message: null });
      return next;
    },
    [repository, saved.data],
  );

  const placeOrder = useCallback(
    async (input: PlaceOrderInput) => {
      const order = await repository.placeOrder(input);
      setOrders((prev) => ({ ...prev, status: 'ready', data: upsert(prev.data, order) }));
      refreshAfterOrderChange();
      return order;
    },
    [repository, refreshAfterOrderChange],
  );

  const applyOrder = useCallback(
    (order: Order) => {
      setOrders((prev) => ({ ...prev, status: 'ready', data: upsert(prev.data, order) }));
      refreshAfterOrderChange();
      return order;
    },
    [refreshAfterOrderChange],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => applyOrder(await repository.cancelOrder(orderId)),
    [repository, applyOrder],
  );
  const acceptFallback = useCallback(
    async (orderId: string, paymentMethodId: string) =>
      applyOrder(await repository.acceptFallback(orderId, paymentMethodId)),
    [repository, applyOrder],
  );
  const declineFallback = useCallback(
    async (orderId: string) => applyOrder(await repository.declineFallback(orderId)),
    [repository, applyOrder],
  );
  const requestRefund = useCallback(
    async (orderId: string) => applyOrder(await repository.requestRefund(orderId)),
    [repository, applyOrder],
  );
  const retryRefund = useCallback(
    async (orderId: string) => applyOrder(await repository.retryRefund(orderId)),
    [repository, applyOrder],
  );

  const applyWaitlistEntry = useCallback(
    (entry: WaitlistEntry) => {
      setWaitlist((prev) => ({ ...prev, status: 'ready', data: upsert(prev.data, entry) }));
      reload(['alerts']);
      return entry;
    },
    [reload],
  );

  const joinWaitlist = useCallback(
    async (campaignId: string, channel: NotificationChannel) =>
      applyWaitlistEntry(await repository.joinWaitlist(campaignId, channel)),
    [repository, applyWaitlistEntry],
  );
  const updateWaitlistChannel = useCallback(
    async (entryId: string, channel: NotificationChannel) =>
      applyWaitlistEntry(await repository.updateWaitlistChannel(entryId, channel)),
    [repository, applyWaitlistEntry],
  );
  const leaveWaitlist = useCallback(
    async (entryId: string) => applyWaitlistEntry(await repository.leaveWaitlist(entryId)),
    [repository, applyWaitlistEntry],
  );

  const markAlertRead = useCallback(
    async (alertId: string) => {
      const next = await repository.markAlertRead(alertId);
      setAlerts({ status: 'ready', data: next, message: null });
    },
    [repository],
  );
  const markAllAlertsRead = useCallback(async () => {
    const next = await repository.markAllAlertsRead();
    setAlerts({ status: 'ready', data: next, message: null });
  }, [repository]);

  const addAddress = useCallback(
    async (input: { label: string; line: string }) => {
      const address = await repository.addresses.add(input);
      setAddresses((prev) => ({ ...prev, status: 'ready', data: upsert(prev.data, address) }));
      return address;
    },
    [repository],
  );

  const persistPreferences = useCallback(
    async (patch: Partial<PrezoPreferences>) => {
      setPreferences((prev) => ({ ...prev, data: { ...prev.data, ...patch } }));
      try {
        const next = await repository.updatePreferences(patch);
        setPreferences({ status: 'ready', data: next, message: null });
      } catch (error) {
        setPreferences((prev) => ({ ...prev, message: describeError(error) }));
      }
    },
    [repository],
  );

  const selectPaymentMethod = useCallback(
    (id: string) => {
      setChosenPaymentMethodId(id);
      persistPreferences({ paymentMethodId: id });
    },
    [persistPreferences],
  );

  const setNotificationPreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      await persistPreferences({
        notifications: { ...preferencesRef.current.notifications, [key]: value },
      });
    },
    [persistPreferences],
  );

  const persistTheme = useCallback(
    (mode: PrezoThemeMode) => {
      persistPreferences({ theme: mode });
    },
    [persistPreferences],
  );

  const rememberSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const current = preferencesRef.current.recentSearches;
      if (current.includes(trimmed)) return;
      persistPreferences({ recentSearches: [trimmed, ...current].slice(0, 8) });
    },
    [persistPreferences],
  );

  const submitReport = useCallback(
    (input: ReportInput) => repository.submitReport(input),
    [repository],
  );
  const loadPolicy = useCallback((topic: string) => repository.getPolicy(topic), [repository]);

  const selectedPaymentMethodId = useMemo(() => {
    const usable = paymentMethods.data.filter((method) => !method.unavailableReason);
    if (chosenPaymentMethodId && usable.some((method) => method.id === chosenPaymentMethodId)) {
      return chosenPaymentMethodId;
    }
    return usable[0]?.id ?? null;
  }, [paymentMethods.data, chosenPaymentMethodId]);

  const unreadAlertCount = useMemo(
    () => alerts.data.filter((alert) => !alert.read).length,
    [alerts.data],
  );

  const openWaitlistOfferCount = useCallback(
    (now: number) =>
      waitlist.data.filter(
        (entry) =>
          entry.status === 'offer' && entry.offerExpiresAt !== null && entry.offerExpiresAt > now,
      ).length,
    [waitlist.data],
  );

  return {
    campaigns,
    sellers,
    orders,
    waitlist,
    alerts,
    saved,
    paymentMethods,
    addresses,
    profile,
    preferences,
    selectedPaymentMethodId,
    unreadAlertCount,
    openWaitlistOfferCount,
    getCampaign,
    getSeller,
    getOrder,
    getWaitlistEntry,
    getAlert,
    reload,
    toggleSaved,
    placeOrder,
    cancelOrder,
    acceptFallback,
    declineFallback,
    requestRefund,
    retryRefund,
    joinWaitlist,
    updateWaitlistChannel,
    leaveWaitlist,
    markAlertRead,
    markAllAlertsRead,
    addAddress,
    selectPaymentMethod,
    setNotificationPreference,
    persistTheme,
    rememberSearch,
    submitReport,
    loadPolicy,
  };
};

