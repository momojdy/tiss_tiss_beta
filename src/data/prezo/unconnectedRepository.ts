import type { PrezoPreferences } from '../../types/prezo';
import { PrezoRepositoryError, type PrezoRepository } from './PrezoRepository';

const notConnected = (action: string): never => {
  throw new PrezoRepositoryError(
    `${action} isn’t available because Prezo isn’t connected to a service yet.`,
    'unavailable',
  );
};

const emptyPreferences: PrezoPreferences = {
  theme: null,
  paymentMethodId: null,
  recentSearches: [],
  notifications: { progress: true, waitlist: true, orders: true },
};

export const createUnconnectedRepository = (): PrezoRepository => {
  let preferences = emptyPreferences;
  return {
    addresses: {
      list: async () => [],
      add: async () => notConnected('Saving an address'),
    },
    listCampaigns: async () => [],
    listSellers: async () => [],
    listOrders: async () => [],
    listWaitlist: async () => [],
    listAlerts: async () => [],
    listSavedCampaignIds: async () => [],
    listPaymentMethods: async () => [],
    getProfile: async () => null,
    getPreferences: async () => preferences,
    updatePreferences: async (patch) => {
      preferences = { ...preferences, ...patch };
      return preferences;
    },
    setCampaignSaved: async () => notConnected('Saving a campaign'),
    placeOrder: async () => notConnected('Placing an order'),
    cancelOrder: async () => notConnected('Cancelling an order'),
    acceptFallback: async () => notConnected('Accepting the fallback price'),
    declineFallback: async () => notConnected('Declining the fallback price'),
    requestRefund: async () => notConnected('Requesting a refund'),
    retryRefund: async () => notConnected('Retrying a refund'),
    joinWaitlist: async () => notConnected('Joining the waitlist'),
    updateWaitlistChannel: async () => notConnected('Changing notifications'),
    leaveWaitlist: async () => notConnected('Leaving the waitlist'),
    markAlertRead: async () => notConnected('Updating alerts'),
    markAllAlertsRead: async () => notConnected('Updating alerts'),
    submitReport: async () => notConnected('Sending a report'),
    getPolicy: async () => null,
  };
};

