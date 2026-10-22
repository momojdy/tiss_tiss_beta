import { useCallback } from 'react';
import { getProvider } from '../../util/Glowz/catalog';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';
import { useChat } from './useChat';
import { useGlowzCommands } from './useGlowzCommands';

/** Notification feed. Promotional items are hidden when "Offers and promotions" is off. */
export function useNotifications() {
  const { state, update } = useGlowzStore();
  const toast = useToast();
  const { openChat } = useChat();
  const { openBooking, goSearch } = useGlowzCommands();

  const visible = state.notes
    .map((n, index) => ({ n, index }))
    .filter(({ n }) => state.prefs.promo || n.k !== 'promo');
  const unreadCount = state.notes.filter((n) => n.u && (state.prefs.promo || n.k !== 'promo')).length;

  const markAllRead = useCallback(() => update((s) => ({ ...s, notes: s.notes.map((n) => ({ ...n, u: 0 as const })) })), [update]);

  const open = useCallback(
    (index: number) => {
      const n = state.notes[index];
      if (!n) return;
      update((s) => ({ ...s, notes: s.notes.map((x, i) => (i === index ? { ...x, u: 0 as const } : x)) }));
      if (n.a === 'bdetail') {
        if (!state.bookings.some((b) => b.ref === n.id)) {
          toast('That booking is no longer available');
          return;
        }
        openBooking(n.id);
      } else if (n.a === 'chat') {
        if (!getProvider(n.id)) {
          toast('That conversation is no longer available');
          return;
        }
        openChat(n.id);
      } else {
        goSearch();
      }
    },
    [goSearch, openBooking, openChat, state.bookings, state.notes, toast, update],
  );

  return { visible, unreadCount, markAllRead, open };
}
