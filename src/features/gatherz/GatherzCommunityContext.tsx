import React, { createContext, useContext, useMemo, useState } from 'react';
import type { CommunityDemo, DemoMoment, DemoPost, DemoInvitation, DemoReport } from '../../data/gatherz/communityDemo';
const Context = createContext<CommunityDemo | null>(null);
const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
export function GatherzCommunityProvider({ children }: { children: React.ReactNode }) {
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [savedOrganizers, setSavedOrganizers] = useState<string[]>([]);
  const [savedCircles, setSavedCircles] = useState<string[]>([]);
  const [joinedCircles, setJoinedCircles] = useState<string[]>([]);
  const [requestedCircles, setRequestedCircles] = useState<string[]>([]);
  const [moments, setMoments] = useState<DemoMoment[]>([]);
  const [posts, setPosts] = useState<DemoPost[]>([]);
  const [invitations, setInvitations] = useState<DemoInvitation[]>([]);
  const [reports, setReports] = useState<DemoReport[]>([]);
  const value = useMemo<CommunityDemo>(() => ({
    savedEvents, savedOrganizers, savedCircles, joinedCircles, requestedCircles, moments, posts, invitations, reports,
    toggleSavedEvent: id => setSavedEvents(v => toggle(v, id)),
    toggleSavedOrganizer: id => setSavedOrganizers(v => toggle(v, id)),
    toggleSavedCircle: id => setSavedCircles(v => toggle(v, id)),
    joinCircle: id => { setJoinedCircles(v => v.includes(id) ? v : [...v, id]); setRequestedCircles(v => v.filter(x => x !== id)); },
    leaveCircle: id => setJoinedCircles(v => v.filter(x => x !== id)),
    requestCircle: id => setRequestedCircles(v => toggle(v, id)),
    addMoment: (eventId, caption, isPublic, uri) => setMoments(v => {
      if (v.filter(m => m.eventId === eventId && m.owner === 'me').length >= 3) return v;
      return [{ id: 'moment-' + Date.now() + '-' + v.length, eventId, caption, owner: 'me', official: false, public: isPublic, uri }, ...v];
    }),
    setMomentVisibility: (id, isPublic) => setMoments(v => v.map(m => m.id === id ? { ...m, public: isPublic } : m)),
    addPost: (circleId, text) => setPosts(v => [{ id: 'post-' + Date.now() + '-' + v.length, circleId, author: 'me', text, createdAt: new Date().toISOString(), replies: [] }, ...v]),
    addReply: (postId, text) => setPosts(v => v.map(p => p.id === postId ? { ...p, replies: [...p.replies, { id: 'reply-' + Date.now() + '-' + p.replies.length, author: 'me', text }] } : p)),
    invite: (circleId, recipient) => setInvitations(v => [{ id: 'invite-' + Date.now() + '-' + v.length, circleId, recipient, status: 'pending' }, ...v]),
    respondInvitation: (id, accept) => {
      setInvitations(v => v.map(i => i.id === id ? { ...i, status: accept ? 'accepted' : 'declined' } : i));
      if (accept) setJoinedCircles(v => { const circleId = invitations.find(i => i.id === id)?.circleId; return circleId && !v.includes(circleId) ? [...v, circleId] : v; });
    },
    report: (targetType, targetId, reason) => setReports(v => [{ id: 'report-' + Date.now() + '-' + v.length, targetType, targetId, reason }, ...v]),
    removeMoment: id => setMoments(v => v.filter(x => x.id !== id)),
  }), [savedEvents, savedOrganizers, savedCircles, joinedCircles, requestedCircles, moments, posts, invitations, reports]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGatherzCommunity() { const ctx = useContext(Context); if (!ctx) throw new Error('GatherzCommunityProvider missing'); return ctx; }
