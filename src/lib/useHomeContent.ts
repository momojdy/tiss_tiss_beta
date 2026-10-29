import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPublishedWantissContent } from './wantissCms';
import { DEFAULT_HOME_CONTENT, buildHomeContent, mergeHomeCopy, type HomeContent } from './wantissHomeContent';

const CACHE_KEY = 'wantiss.home.content.v1';
let memory: HomeContent = DEFAULT_HOME_CONTENT;

/**
 * Published Home content with defaults underneath.
 * The last good text is cached on the device so a cold start without network keeps the published wording;
 * images are signed URLs that expire, so they are only used from a fresh fetch.
 */
export function useHomeContent(): HomeContent {
  const [content, setContent] = useState<HomeContent>(memory);

  useEffect(() => {
    let active = true;
    (async () => {
      if (memory === DEFAULT_HOME_CONTENT) {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw && active && memory === DEFAULT_HOME_CONTENT) {
            memory = { copy: mergeHomeCopy(JSON.parse(raw)), images: {} };
            setContent(memory);
          }
        } catch { /* a missing or corrupt cache just means defaults */ }
      }
      try {
        const published = await fetchPublishedWantissContent('en');
        const { content: next, found } = buildHomeContent(published.content as any, published.assets);
        if (!active) return;
        memory = next;
        setContent(next);
        try {
          if (found) await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next.copy));
          else await AsyncStorage.removeItem(CACHE_KEY);
        } catch { /* caching is best effort */ }
      } catch { /* keep whatever is on screen; published content is optional */ }
    })();
    return () => { active = false; };
  }, []);

  return content;
}
