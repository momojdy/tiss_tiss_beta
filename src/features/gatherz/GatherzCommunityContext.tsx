import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CommunityDemo, DemoMoment } from '../../data/gatherz/communityDemo';
const Context = createContext<CommunityDemo | null>(null);
const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
export function GatherzCommunityProvider({ children }: { children: React.ReactNode }) {
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [savedOrganizers, setSavedOrganizers] = useState<string[]>([]);
  const [savedCircles, setSavedCircles] = useState<string[]>([]);
  const [joinedCircles, setJoinedCircles] = useState<string[]>([]);
  const [requestedCircles, setRequestedCircles] = useState<string[]>([]);
  const [moments, setMoments] = useState<DemoMoment[]>([]);
  const value = useMemo<CommunityDemo>(() => ({
    savedEvents, savedOrganizers, savedCircles, joinedCircles, requestedCircles, moments,
    toggleSavedEvent: id => setSavedEvents(v => toggle(v, id)),
    toggleSavedOrganizer: id => setSavedOrganizers(v => toggle(v, id)),
    toggleSavedCircle: id => setSavedCircles(v => toggle(v, id)),
    joinCircle: id => { setJoinedCircles(v => v.includes(id) ? v : [...v, id]); setRequestedCircles(v => v.filter(x => x !== id)); },
    leaveCircle: id => setJoinedCircles(v => v.filter(x => x !== id)),
    requestCircle: id => setRequestedCircles(v => toggle(v, id)),
    addMoment: (eventId, caption, isPublic) => setMoments(v => [{ id: 'moment-' + (Date.now()) + '-' + v.length, eventId, caption, owner: 'me', official: false, public: isPublic }, ...v]),
    removeMoment: id => setMoments(v => v.filter(x => x.id !== id)),
  }), [savedEvents, savedOrganizers, savedCircles, joinedCircles, requestedCircles, moments]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGatherzCommunity() { const ctx = useContext(Context); if (!ctx) throw new Error('GatherzCommunityProvider missing'); return ctx; }
