import { useCallback } from 'react';
import { BANNERS } from '../../data/glowz/banners';
import { HOME_SECTIONS } from '../../data/glowz/sections';
import { POSTS } from '../../data/glowz/posts';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { searchFocusBus } from '../../util/Glowz/events';
import { useGlowzHost } from './GlowzHostContext';
import { useGlowzStore } from './GlowzStore';
import { useToast } from './GlowzToast';

/** Cross-screen navigation shortcuts that also touch state (recent views, category, search mode). */
export function useGlowzCommands() {
  const nav = useGlowzNav();
  const { update } = useGlowzStore();
  const host = useGlowzHost();
  const toast = useToast();

  const touchRecent = useCallback(
    (id: string) => update((s) => (s.prefs.private ? { ...s, recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 8) } : s)),
    [update],
  );

  const openProvider = useCallback(
    (id: string) => {
      touchRecent(id);
      nav.push({ name: 'Provider', id, tab: 'svc' });
    },
    [nav, touchRecent],
  );

  const openPost = useCallback(
    (postId: string) => {
      const x = POSTS.find((y) => y.id === postId);
      if (!x) return;
      touchRecent(x.p);
      nav.push({ name: 'Provider', id: x.p, tab: 'port' });
    },
    [nav, touchRecent],
  );

  const openBooking = useCallback((ref: string) => nav.push({ name: 'BookingDetail', ref }), [nav]);
  const openSection = useCallback(
    (id: string) => {
      const s = HOME_SECTIONS.find((x) => x.id === id);
      if (s) nav.push({ name: 'SectionList', id: s.id, title: s.title });
    },
    [nav],
  );

  const goHome = useCallback(() => {
    update((s) => ({ ...s, bk: null }));
    nav.goRoot('home');
  }, [nav, update]);

  const goSearch = useCallback(() => {
    update((s) => ({ ...s, expl: 'providers' }));
    nav.goRoot('explore');
    setTimeout(() => searchFocusBus.emit(), 60);
  }, [nav, update]);

  const goInspire = useCallback(() => {
    update((s) => ({ ...s, expl: 'inspire' }));
    nav.goRoot('explore');
  }, [nav, update]);

  /** Pick a category. From anywhere but the Explore root this jumps to Explore. */
  const pickCategory = useCallback(
    (id: string | null) => {
      const away = nav.tab !== 'explore' || nav.stack.length > 0;
      update((s) => ({ ...s, cat: id, expl: away ? 'providers' : s.expl }));
      if (away) nav.goRoot('explore');
    },
    [nav, update],
  );

  const openBanner = useCallback(
    (id: string) => {
      const b = BANNERS.find((x) => x.id === id);
      if (!b) return;
      if (b.promo) {
        if (host.copyToClipboard) {
          void Promise.resolve(host.copyToClipboard(b.promo));
          toast('Code ' + b.promo + ' copied. Enter it at checkout.');
        } else {
          toast('Use code ' + b.promo + ' at checkout.');
        }
      }
      update((s) => ({ ...s, cat: b.cat ?? null, expl: 'providers' }));
      nav.goRoot('explore');
    },
    [host, nav, toast, update],
  );

  return { touchRecent, openProvider, openPost, openBooking, openSection, goHome, goSearch, goInspire, pickCategory, openBanner };
}
