import React, { createContext, useContext, useMemo, useState } from 'react';
import { defaultExploreFilters, type ExploreFilters } from '../../lib/prezo/campaignFilters';

interface ExploreValue {
  filters: ExploreFilters;
  setFilters: React.Dispatch<React.SetStateAction<ExploreFilters>>;
}

const PrezoExploreContext = createContext<ExploreValue | null>(null);

export const PrezoExploreProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<ExploreFilters>(defaultExploreFilters);
  const value = useMemo(() => ({ filters, setFilters }), [filters]);
  return <PrezoExploreContext.Provider value={value}>{children}</PrezoExploreContext.Provider>;
};

export const usePrezoExplore = (): ExploreValue => {
  const value = useContext(PrezoExploreContext);
  if (!value) throw new Error('usePrezoExplore must be used inside PrezoExploreProvider');
  return value;
};

