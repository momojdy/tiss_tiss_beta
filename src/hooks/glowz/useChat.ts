import { useCallback, useEffect, useRef } from 'react';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { getProvider } from '../utils/catalog';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';

const AUTO_REPLY = 'Thanks! We will get back to you shortly.';

/** Local messaging. Replies are clearly labelled automatic samples. */
export function useChat() {
  const { state, update } = useGlowzStore();
  const nav = useGlowzNav();
  const toast = useToast();
  const navRef = useRef(nav);
  navRef.current = nav;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openChat = useCallback(
    (id: string) => {
      if (!getProvider(id)) {
        toast('That conversation is no longer available');
        return;
      }
      update((s) => {
        const chatU = { ...s.chatU };
        delete chatU[id];
        return { ...s, chatU };
      });
      nav.push({ name: 'Chat', id });
    },
    [nav, toast, update],
  );

  const send = useCallback(
    (id: string, text: string): boolean => {
      const t = text.trim();
      if (!t) return false;
      update((s) => ({ ...s, chat: { ...s.chat, [id]: [...(s.chat[id] ?? []), { me: 1, t }] } }));
      timers.current.push(
        setTimeout(() => {
          const cur = navRef.current.current;
          const watching = cur?.name === 'Chat' && cur.id === id;
          update((s) => ({
            ...s,
            chat: { ...s.chat, [id]: [...(s.chat[id] ?? []), { me: 0, auto: 1, t: AUTO_REPLY }] },
            chatU: watching ? s.chatU : { ...s.chatU, [id]: true },
          }));
        }, 900),
      );
      return true;
    },
    [update],
  );

  return { chat: state.chat, unread: state.chatU, openChat, send };
}
