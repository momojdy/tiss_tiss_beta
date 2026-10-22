import React, { createContext, useContext } from 'react';
import type { GlowzStorage } from '../utils/storage';
import { createMemoryStorage } from '../utils/storage';

/** Things only the host app can do. Everything is optional; the feature degrades gracefully without them. */
export interface GlowzHost {
  storage: GlowzStorage;
  /** Copy text to the clipboard. Without it the text is shown in a toast instead. */
  copyToClipboard?: (text: string) => void | Promise<void>;
  /** Open the photo library. Return a file URI, or null if cancelled. Without it the built-in illustrations cycle. */
  pickImage?: (kind: 'cover' | 'avatar') => Promise<string | null>;
  /** Share a link using the system share sheet. Without it the link is copied or shown. */
  shareLink?: (url: string) => void | Promise<void>;
}

const HostContext = createContext<GlowzHost>({ storage: createMemoryStorage() });

export function GlowzHostProvider({ host, children }: { host: GlowzHost; children: React.ReactNode }) {
  return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
}

export const useGlowzHost = (): GlowzHost => useContext(HostContext);
