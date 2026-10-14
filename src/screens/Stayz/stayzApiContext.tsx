import React, { createContext, useContext } from 'react';
import { StayzApi } from './stayzApi';

const ApiContext = createContext<StayzApi | null>(null);

export const StayzApiProvider = ({ api, children }: { api: StayzApi; children: React.ReactNode }) => <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;

export const useStayzApi = () => {
  const v = useContext(ApiContext);
  if (!v) throw new Error('StayzApiProvider missing');
  return v;
};
