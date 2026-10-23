import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface ToastValue {
  message: string | null;
  show: (message: string) => void;
}

const PrezoToastContext = createContext<ToastValue | null>(null);

export const PrezoToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  const value = useMemo(() => ({ message, show }), [message, show]);
  return <PrezoToastContext.Provider value={value}>{children}</PrezoToastContext.Provider>;
};

export const usePrezoToast = (): ToastValue => {
  const value = useContext(PrezoToastContext);
  if (!value) throw new Error('usePrezoToast must be used inside PrezoToastProvider');
  return value;
};

