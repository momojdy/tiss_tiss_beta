import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Filters, Place, SearchState } from './stayzTypes';
import { addDays, today } from './stayzDates';
import { defaultFilters } from './stayzListings';
import { getCurrentPlace } from './stayzLocation';

type LocationStatus = 'locating' | 'granted' | 'denied' | 'unavailable';

interface SearchValue {
  search: SearchState;
  filters: Filters;
  locationStatus: LocationStatus;
  setSearch: (patch: Partial<SearchState>) => void;
  setFilters: (f: Filters) => void;
  locate: () => Promise<boolean>;
  setMode: (mode: SearchState['mode']) => void;
}

const initial = (): SearchState => ({
  mode: 'overnight',
  place: null,
  date: today(),
  endDate: addDays(today(), 1),
  time: '10:00',
  hours: 3,
  windowIndex: 0,
  adults: 2,
  children: 0,
  rooms: 1,
});

const SearchContext = createContext<SearchValue | null>(null);

export const StayzSearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [search, setSearchState] = useState<SearchState>(initial());
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');

  const setSearch = useCallback((patch: Partial<SearchState>) => setSearchState(prev => ({ ...prev, ...patch })), []);

  const locate = useCallback(async () => {
    setLocationStatus('locating');
    const r = await getCurrentPlace();
    if (r.status === 'granted') {
      setSearchState(prev => ({ ...prev, place: r.place as Place }));
      setLocationStatus('granted');
      return true;
    }
    setLocationStatus(r.status);
    return false;
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  const setMode = useCallback((mode: SearchState['mode']) => {
    setSearchState(prev => {
      const next = { ...prev, mode };
      if (mode === 'extended' && next.endDate < addDays(next.date, 7)) next.endDate = addDays(next.date, 7);
      if (mode === 'overnight' && next.endDate > addDays(next.date, 6)) next.endDate = addDays(next.date, 1);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ search, filters, locationStatus, setSearch, setFilters, locate, setMode }), [search, filters, locationStatus, setSearch, locate, setMode]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

export const useStayzSearch = () => {
  const v = useContext(SearchContext);
  if (!v) throw new Error('StayzSearchProvider missing');
  return v;
};
