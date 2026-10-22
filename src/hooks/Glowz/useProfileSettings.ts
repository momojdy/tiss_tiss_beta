import { useCallback } from 'react';
import { createInitialState } from '../data/seeds';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import type { Preferences, ThemeMode } from '../types/state';
import { ProfileErrors, validateProfile } from '../utils/profileValidation';
import { STATE_KEY } from '../utils/storage';
import { savedNote } from '../utils/storageStatus';
import { useGlowzHost } from './GlowzHostContext';
import { useGlowzStore } from './GlowzStore';
import { useGlowzSheet } from './GlowzSheetContext';
import { useToast } from './GlowzToast';

export const REFERRAL_CODE = 'GLOW-SAMPLE25';
/** Appearance, notification preferences, profile details, pictures and reset. */
export function useProfileSettings() {
  const { state, update } = useGlowzStore();
  const host = useGlowzHost();
  const nav = useGlowzNav();
  const toast = useToast();
  const { closeSheet } = useGlowzSheet();

  const setTheme = useCallback((theme: ThemeMode) => update((s) => ({ ...s, theme })), [update]);
  const togglePref = useCallback((k: keyof Preferences) => update((s) => ({ ...s, prefs: { ...s.prefs, [k]: !s.prefs[k] } })), [update]);

  const saveProfile = useCallback(
    (name: string, phone: string): ProfileErrors => {
      const err = validateProfile(name, phone);
      if (err.name || err.phone) return err;
      update((s) => ({ ...s, profile: { name: name.trim(), phone: phone.trim() } }));
      closeSheet();
      toast('Profile updated. ' + savedNote());
      return err;
    },
    [closeSheet, toast, update],
  );

  const changePicture = useCallback(
    async (kind: 'cover' | 'avatar') => {
      const key = kind;
      if (host.pickImage) {
        try {
          const uri = await host.pickImage(kind);
          if (uri) {
            update((s) => ({ ...s, [key]: { kind: 'uri', uri } }));
            toast('Photo updated');
          }
        } catch {
          toast('Could not open the photo library');
        }
        return;
      }
      update((s) => {
        const cur = s[key];
        const index = cur && cur.kind === 'tone' ? (cur.index + 1) % 4 : 0;
        return { ...s, [key]: { kind: 'tone', index } };
      });
      toast('Demo picture changed. Connect a photo picker to use your own.');
    },
    [host, toast, update],
  );

  const copyReferral = useCallback(() => {
    if (host.copyToClipboard) {
      void Promise.resolve(host.copyToClipboard(REFERRAL_CODE));
      toast('Referral code copied');
    } else {
      toast(REFERRAL_CODE);
    }
  }, [host, toast]);

  const clearRecent = useCallback(() => {
    update((s) => ({ ...s, recent: [] }));
    toast('Recently viewed cleared');
  }, [toast, update]);

  const resetDemo = useCallback(async () => {
    try {
      await host.storage.removeItem(STATE_KEY);
    } catch {
      /* nothing saved to remove */
    }
    update((s) => ({ ...createInitialState(), theme: s.theme }));
    nav.goRoot('home');
    toast('Demo data reset');
  }, [host, nav, toast, update]);

  return { profile: state.profile, theme: state.theme, prefs: state.prefs, setTheme, togglePref, saveProfile, changePicture, copyReferral, clearRecent, resetDemo };
}
