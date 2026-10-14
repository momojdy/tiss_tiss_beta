import React, { createContext, useContext } from 'react';

export interface HostActions {
  onOpenWallet: () => void;
  onExitToWantiss: () => void;
  onListProperty: () => void;
}

const HostContext = createContext<HostActions>({ onOpenWallet: () => undefined, onExitToWantiss: () => undefined, onListProperty: () => undefined });

export const StayzHostProvider = ({ actions, children }: { actions: HostActions; children: React.ReactNode }) => <HostContext.Provider value={actions}>{children}</HostContext.Provider>;

export const useStayzHost = () => useContext(HostContext);
