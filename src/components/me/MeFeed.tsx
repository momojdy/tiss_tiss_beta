import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const MAGENTA = '#BF008E';
const INK = '#1E1B3A';
const MUTED = '#73728A';
const TAB_MUTED = '#A8A5BC';
const SOFT_PINK = '#FCE4F1';
const PLACEHOLDER = '#F5E8EF';

/* ------------------------------ Types ------------------------------ */
export type TabKey = 'for_you' | 'favorites' | 'reviews';

export type FeedItem = {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  price?: number;
  soldCount?: number;
  discountLabel?: string | null;
  rating?: number;
  comment?: string | null;
};

export type TabState = {
  items: FeedItem[];
  page: number;
  done: boolean;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

export const TABS: { key: TabKey; label: string }[] = [
  { key: 'for_you', label: 'For You' },
  { key: 'favorites', label: 'My Favorites' },
  { key: 'reviews', label: 'My Reviews' }
];

const PAGE_SIZE = 12;
const emptyTab: TabState = { items: [], page: 0, done: false, loading: false, loaded: false, error: null };

/* --------------------------- Data (Supabase) --------------------------- */
const PRODUCT_COLS = 'id, title, image_url, price, sold_count, discount_label';

const toProduct = (p: any, id = p.id): FeedItem => ({
  id,
  productId: p.id,
  title: p.title,
  imageUrl: p.image_url ?? null,
  price: p.price != null ? Number(p.price) : undefined,
  soldCount: p.sold_count ?? undefined,
  discountLabel: p.discount_label ?? null
});

async function fetchFeed(tab: TabKey, userId: string, page: number): Promise<FeedItem[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (tab === 'for_you') {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []).map((p: any) => toProduct(p));
  }

  if (tab === 'favorites') {
    const { data, error } = await supabase
      .from('favorites')
      .select(`id, product:products(${PRODUCT_COLS})`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []).filter((r: any) => r.product).map((r: any) => toProduct(r.product, r.id));
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, product:products(id, title, image_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => r.product)
    .map((r: any) => ({ ...toProduct(r.product, r.id), rating: r.rating, comment: r.comment }));
}

export function useFeed(userId: string) {
  const [state, setState] = useState<Record<TabKey, TabState>>({
    for_you: emptyTab,
    favorites: emptyTab,
    reviews: emptyTab
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const inflight = useRef<Record<TabKey, boolean>>({ for_you: false, favorites: false, reviews: false });

  const load = useCallback(
    async (tab: TabKey, reset = false) => {
      if (inflight.current[tab]) return;
      const cur = stateRef.current[tab];
      if (!reset && cur.done) return;

      inflight.current[tab] = true;
      setState((s) => ({ ...s, [tab]: { ...s[tab], loading: true, error: null } }));
      try {
        const page = reset ? 0 : cur.page;
        const rows = await fetchFeed(tab, userId, page);
        setState((s) => ({
          ...s,
          [tab]: {
            items: reset ? rows : [...s[tab].items, ...rows],
            page: page + 1,
            done: rows.length < PAGE_SIZE,
            loading: false,
            loaded: true,
            error: null
          }
        }));
      } catch (e: any) {
        setState((s) => ({
          ...s,
          [tab]: { ...s[tab], loading: false, loaded: true, error: e?.message ?? 'Something went wrong' }
        }));
      } finally {
        inflight.current[tab] = false;
      }
    },
    [userId]
  );

  return { state, load };
}

/* ------------------------------ UI ------------------------------ */
export function FeedTabs({ active, onSelect }: { active: TabKey; onSelect: (t: TabKey) => void }) {
  return (
    <View style={styles.tabs}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onSelect(t.key)} hitSlop={8} style={styles.tab}>
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            <View style={[styles.tabUnderline, on && styles.tabUnderlineOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? 'star' : 'star-outline'} size={13} color={MAGENTA} />
      ))}
    </View>
  );
}

export function FeedCard({
  item,
  width,
  onPress
}: {
  item: FeedItem;
  width: number;
  onPress?: (i: FeedItem) => void;
}) {
  const isReview = item.rating != null;
  return (
    <Pressable onPress={() => onPress?.(item)} style={{ width }}>
      <View style={[styles.image, { width, height: width }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={28} color={TAB_MUTED} />
        )}
      </View>

      {isReview ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          <Stars value={item.rating ?? 0} />
          {item.comment ? (
            <Text style={styles.comment} numberOfLines={3}>
              {item.comment}
            </Text>
          ) : null}
          <Text style={styles.reviewedTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.discountLabel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.discountLabel}</Text>
            </View>
          ) : null}
          <View style={styles.priceRow}>
            {item.price != null && <Text style={styles.price}>${item.price.toFixed(2)}</Text>}
            {item.soldCount ? <Text style={styles.sold}>{item.soldCount}+ sold</Text> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const EMPTY: Record<TabKey, { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }> = {
  for_you: { icon: 'sparkles-outline', title: 'Nothing to show yet', body: 'Picks for you will appear here.' },
  favorites: { icon: 'heart-outline', title: 'No favorites yet', body: 'Tap the heart on a product to save it here.' },
  reviews: { icon: 'chatbubble-outline', title: 'No reviews yet', body: 'Reviews you write will appear here.' }
};

export function FeedEmptyState({
  tab,
  state,
  cardWidth,
  onRetry
}: {
  tab: TabKey;
  state: TabState;
  cardWidth: number;
  onRetry: () => void;
}) {
  if (!state.loaded && state.loading) {
    return (
      <View style={styles.skelWrap}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: cardWidth }}>
            <View style={[styles.image, { width: cardWidth, height: cardWidth }]} />
            <View style={[styles.skelLine, { width: cardWidth * 0.9 }]} />
            <View style={[styles.skelLine, { width: cardWidth * 0.5 }]} />
          </View>
        ))}
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={34} color={INK} />
        <Text style={styles.emptyTitle}>Couldn't load this tab</Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (state.loaded && !state.loading && state.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name={EMPTY[tab].icon} size={34} color={INK} />
        <Text style={styles.emptyTitle}>{EMPTY[tab].title}</Text>
        <Text style={styles.emptyBody}>{EMPTY[tab].body}</Text>
      </View>
    );
  }

  return null;
}

export function FeedFooter({ loading, hasItems }: { loading: boolean; hasItems: boolean }) {
  if (loading && hasItems) return <ActivityIndicator color={MAGENTA} style={{ marginVertical: 20 }} />;
  return null;
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 26,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF'
  },
  tab: { alignItems: 'flex-start' },
  tabText: { fontSize: 17, fontWeight: '500', color: TAB_MUTED },
  tabTextOn: { fontSize: 18, fontWeight: '700', color: INK },
  tabUnderline: { height: 3, width: 22, borderRadius: 2, marginTop: 4, backgroundColor: 'transparent' },
  tabUnderlineOn: { backgroundColor: MAGENTA },

  image: {
    backgroundColor: PLACEHOLDER,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { fontSize: 13, fontWeight: '500', color: INK, lineHeight: 18 },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: SOFT_PINK,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5
  },
  tagText: { fontSize: 11, fontWeight: '600', color: MAGENTA },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 5 },
  price: { fontSize: 18, fontWeight: '700', color: MAGENTA },
  sold: { fontSize: 11, color: MUTED },
  comment: { fontSize: 13, color: INK, lineHeight: 18 },
  reviewedTitle: { fontSize: 11, color: MUTED },

  skelWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14 },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: PLACEHOLDER, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: INK, marginTop: 6 },
  emptyBody: { fontSize: 13, color: MUTED, textAlign: 'center' },
  retry: { marginTop: 10, backgroundColor: MAGENTA, borderRadius: 99, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 }
});