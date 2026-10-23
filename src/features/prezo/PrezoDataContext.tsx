import React, { createContext, useContext } from 'react';
import type { PrezoRepository } from '../../data/prezo/PrezoRepository';
import { usePrezoStore, type PrezoStore } from './usePrezoStore';

const PrezoDataContext = createContext<PrezoStore | null>(null);

interface ProviderProps {
  repository: PrezoRepository;
  children: React.ReactNode;
}

export const PrezoDataProvider = ({ repository, children }: ProviderProps) => {
  const store = usePrezoStore(repository);
  return <PrezoDataContext.Provider value={store}>{children}</PrezoDataContext.Provider>;
};

export const usePrezoData = (): PrezoStore => {
  const store = useContext(PrezoDataContext);
  if (!store) throw new Error('usePrezoData must be used inside PrezoDataProvider');
  return store;
};

