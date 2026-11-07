/** Frontend-only Gatherz social demo data; mirrors the v8.1 Discover/My tabs. */
export interface DemoCircle { id: string; name: string; category: string; members: number; private: boolean; closed: boolean }
export interface DemoMoment { id: string; eventId: string; caption: string; owner: string; official: boolean; public: boolean; uri?: string }
export const demoCircles: DemoCircle[] = [
  { id: 'c1', name: 'Manila Running Circle', category: 'Sports', members: 128, private: false, closed: false },
  { id: 'c2', name: 'Sunday Book Club', category: 'Culture', members: 46, private: true, closed: false },
  { id: 'c3', name: 'Street Photography', category: 'Culture', members: 92, private: false, closed: false },
];
export interface DemoPost { id: string; circleId: string; author: string; text: string; createdAt: string; replies: { id: string; author: string; text: string }[] }
export interface DemoInvitation { id: string; circleId: string; recipient: string; status: 'pending' | 'accepted' | 'declined' }
export interface DemoReport { id: string; targetType: 'post' | 'member' | 'moment' | 'event' | 'organizer' | 'circle'; targetId: string; reason: string }
export interface CommunityDemo {
  savedEvents: string[]; savedOrganizers: string[]; savedCircles: string[];
  joinedCircles: string[]; requestedCircles: string[]; moments: DemoMoment[]; posts: DemoPost[]; invitations: DemoInvitation[]; reports: DemoReport[];
  toggleSavedEvent(id: string): void; toggleSavedOrganizer(id: string): void; toggleSavedCircle(id: string): void;
  joinCircle(id: string): void; leaveCircle(id: string): void; requestCircle(id: string): void;
  addMoment(eventId: string, caption: string, isPublic: boolean, uri: string): void; removeMoment(id: string): void;
  setMomentVisibility(id: string, isPublic: boolean): void;
  addPost(circleId: string, text: string): void; addReply(postId: string, text: string): void;
  invite(circleId: string, recipient: string): void; respondInvitation(id: string, accept: boolean): void;
  report(targetType: DemoReport['targetType'], targetId: string, reason: string): void;
}
