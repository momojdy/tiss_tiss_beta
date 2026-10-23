import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ShareSheet } from '../../components/prezo/campaign/ShareSheet';
import type { Campaign } from '../../types/prezo';
import { usePrezoData } from './PrezoDataContext';
import { usePrezoToast } from './PrezoToastContext';

interface CampaignActionsValue {
  toggleSaved: (campaign: Campaign) => Promise<void>;
  share: (campaign: Campaign) => void;
}

const PrezoCampaignActionsContext = createContext<CampaignActionsValue | null>(null);

export const PrezoCampaignActionsProvider = ({ children }: { children: React.ReactNode }) => {
  const data = usePrezoData();
  const toast = usePrezoToast();
  const [sharing, setSharing] = useState<Campaign | null>(null);

  const toggleSaved = useCallback(
    async (campaign: Campaign) => {
      try {
        const nowSaved = await data.toggleSaved(campaign.id);
        toast.show(nowSaved ? 'Saved. Bookmarks don’t reserve anything.' : 'Removed from saved');
      } catch (error) {
        toast.show(error instanceof Error ? error.message : 'Couldn’t update saved campaigns.');
      }
    },
    [data, toast],
  );

  const share = useCallback((campaign: Campaign) => setSharing(campaign), []);

  const value = useMemo(() => ({ toggleSaved, share }), [toggleSaved, share]);

  return (
    <PrezoCampaignActionsContext.Provider value={value}>
      {children}
      <ShareSheet campaign={sharing} onClose={() => setSharing(null)} />
    </PrezoCampaignActionsContext.Provider>
  );
};

export const usePrezoCampaignActions = (): CampaignActionsValue => {
  const value = useContext(PrezoCampaignActionsContext);
  if (!value) throw new Error('usePrezoCampaignActions must be used inside PrezoCampaignActionsProvider');
  return value;
};

