import React from 'react';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import type { Campaign } from '../../../types/prezo';
import { EmptyState } from '../shared/EmptyState';
import { SectionHeader } from '../shared/PageHeading';
import { CampaignGrid } from './CampaignGrid';

interface CampaignStripProps {
  title: string;
  campaigns: Campaign[];
  emptyMessage?: string;
}

export const CampaignStrip = ({
  title,
  campaigns,
  emptyMessage = 'No campaigns here yet.',
}: CampaignStripProps) => {
  const navigation = usePrezoNavigation();
  return (
    <>
      <SectionHeader
        title={title}
        linkLabel="See all"
        onLinkPress={() => navigation.navigate({ name: 'explore', category: null })}
      />
      <CampaignGrid campaigns={campaigns} empty={<EmptyState message={emptyMessage} />} />
    </>
  );
};

