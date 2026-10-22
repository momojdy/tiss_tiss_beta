import React, { createContext, useContext } from 'react';

export interface PrezoChromeInsets {
  top: number;
  bottom: number;
}

const PrezoChromeContext = createContext<PrezoChromeInsets>({ top: 0, bottom: 0 });

export const PrezoChromeProvider = ({
  value,
  children,
}: {
  value: PrezoChromeInsets;
  children: React.ReactNode;
}) => <PrezoChromeContext.Provider value={value}>{children}</PrezoChromeContext.Provider>;

export const usePrezoChrome = () => useContext(PrezoChromeContext);

