import { useCallback } from 'react';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';

type FavKind = 'p' | 's' | 'x';
const FIELD = { p: 'favP', s: 'favS', x: 'favX' } as const;

const toggleIn = (list: string[], id: string): string[] => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Saving providers, services and looks, following, and liking looks. */
export function useFavorites() {
  const { state, update } = useGlowzStore();
  const toast = useToast();

  const toggleFavorite = useCallback(
    (kind: FavKind, id: string) => {
      const field = FIELD[kind];
      const was = state[field].includes(id);
      update((s) => ({ ...s, [field]: toggleIn(s[field], id) }));
      toast(was ? 'Removed from favorites' : 'Saved to favorites');
    },
    [state, update, toast],
  );

  const toggleFollow = useCallback(
    (id: string) => {
      const was = state.follow.includes(id);
      update((s) => ({ ...s, follow: toggleIn(s.follow, id) }));
      toast(was ? 'Unfollowed' : 'Following. You will see their new work.');
    },
    [state.follow, update, toast],
  );

  const toggleLike = useCallback((id: string) => update((s) => ({ ...s, likes: toggleIn(s.likes, id) })), [update]);

  return {
    isProviderSaved: (id: string) => state.favP.includes(id),
    isServiceSaved: (id: string) => state.favS.includes(id),
    isLookSaved: (id: string) => state.favX.includes(id),
    isLiked: (id: string) => state.likes.includes(id),
    isFollowing: (id: string) => state.follow.includes(id),
    toggleFavorite,
    toggleFollow,
    toggleLike,
  };
}