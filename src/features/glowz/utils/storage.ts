/** Minimal async key/value store. The host passes AsyncStorage, MMKV or similar; the default keeps data in memory. */
export interface GlowzStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryStorage(): GlowzStorage {
  const m = new Map<string, string>();
  return {
    getItem: async (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k, v) => {
      m.set(k, v);
    },
    removeItem: async (k) => {
      m.delete(k);
    },
  };
}

export const STATE_KEY = 'glowz-v1-state';
export const THEME_KEY = 'glowz-theme';
export const STATE_VERSION = 2;