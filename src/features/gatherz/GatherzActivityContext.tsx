import React, { createContext, useContext, useMemo, useState } from 'react';
export type ActivityCategory = 'tickets' | 'transfers' | 'events' | 'circles' | 'moments';
export interface ActivityItem { id: string; category: ActivityCategory; title: string; body: string; createdAt: string; read: boolean; route?: string; targetId?: string }
export interface GatherzPreferences { interests: string[]; area: string; enabled: ActivityCategory[]; visibility: 'Public' | 'Private'; reducedMotion: boolean }
interface ActivityState { items: ActivityItem[]; preferences: GatherzPreferences; notify: (category: ActivityCategory, title: string, body: string, route?: string, targetId?: string) => void; markRead: (id: string) => void; markAllRead: () => void; setPreferences: (next: GatherzPreferences) => void }
const defaults: GatherzPreferences = { interests: [], area: 'Makati', enabled: ['tickets','transfers','events','circles','moments'], visibility: 'Public', reducedMotion: false };
const Context = createContext<ActivityState | null>(null);
export function GatherzActivityProvider({ children }: { children: React.ReactNode }) {
 const [items, setItems] = useState<ActivityItem[]>([]);
 const [preferences, setPreferences] = useState<GatherzPreferences>(defaults);
 const value = useMemo<ActivityState>(() => ({
  items, preferences, setPreferences,
  notify: (category, title, body, route, targetId) => setItems(v => [{ id: 'activity-' + Date.now() + '-' + v.length, category, title, body, createdAt: new Date().toISOString(), read: false, route, targetId }, ...v]),
  markRead: id => setItems(v => v.map(x => x.id === id ? { ...x, read: true } : x)),
  markAllRead: () => setItems(v => v.map(x => ({ ...x, read: true }))),
 }), [items, preferences]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGatherzActivity() { const value = useContext(Context); if (!value) throw new Error('GatherzActivityProvider missing'); return value; }
