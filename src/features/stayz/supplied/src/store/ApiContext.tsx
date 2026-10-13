import React, { createContext, useContext } from 'react';
import { StayzApi } from '../services/api';

const ApiContext = createContext<StayzApi | null>(null);

export const ApiProvider = ({ api, children }: { api: StayzApi; children: React.ReactNode }) => <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;

export const useApi = () => {
  const v = useContext(ApiContext);
  if (!v) throw new Error('ApiProvider missing');
  return v;
};
