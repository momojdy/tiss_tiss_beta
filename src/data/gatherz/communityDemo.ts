/** Frontend-only Gatherz social demo data; mirrors the v8.1 Discover/My tabs. */
export interface DemoCircle { id: string; name: string; category: string; members: number; private: boolean; closed: boolean }
export interface DemoMoment { id: string; eventId: string; caption: string; owner: string; official: boolean; public: boolean }
export const demoCircles: DemoCircle[] = [
  { id: 'c1', name: 'Manila Running Circle', category: 'Sports', members: 128, private: false, closed: false },
  { id: 'c2', name: 'Sunday Book Club', category: 'Culture', members: 46, private: true, closed: false },
  { id: 'c3', name: 'Street Photography', category: 'Culture', members: 92, private: false, closed: false },
];
export interface CommunityDemo {
  savedEvents: string[]; savedOrganizers: string[]; savedCircles: string[];
  joinedCircles: string[]; requestedCircles: string[]; moments: DemoMoment[];
  toggleSavedEvent(id: string): void; toggleSavedOrganizer(id: string): void; toggleSavedCircle(id: string): void;
  joinCircle(id: string): void; leaveCircle(id: string): void; requestCircle(id: string): void;
  addMoment(eventId: string, caption: string, isPublic: boolean): void; removeMoment(id: string): void;
}
