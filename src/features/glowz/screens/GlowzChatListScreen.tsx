import React from 'react';
import { Pressable, View } from 'react-native';
import { PROVIDERS } from '../data/providers';
import { useGlowzState } from '../hooks/GlowzStore';
import { useChat } from '../hooks/useChat';
import { useGlowzCommands } from '../hooks/useGlowzCommands';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter } from '../styles/LayoutContext';
import { GlowzArt } from '../components/GlowzArt';
import { GlowzBadge } from '../components/GlowzBadge';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzCard } from '../components/GlowzCard';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzText } from '../components/GlowzText';
import { GlowzTopBar } from '../components/GlowzTopBar';
import { providerIcon } from '../utils/catalog';

export function GlowzChatListScreen() {
  const g = useGutter();
  const nav = useGlowzNav();
  const { bookings } = useGlowzState();
  const { chat, unread, openChat } = useChat();
  const { goSearch } = useGlowzCommands();
  const list = PROVIDERS.filter((p) => chat[p.id] || bookings.some((b) => b.p === p.id));
  return (
    <GlowzScreen header={<GlowzTopBar title="Messages" onBack={nav.back} />}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 10 }}>
        {list.length ? list.map((p) => {
          const m = chat[p.id];
          const u = !!unread[p.id];
          return (
            <Pressable key={p.id} onPress={() => openChat(p.id)} accessibilityRole="button" accessibilityLabel={`${p.name}${u ? ', unread' : ''}`}>
              <GlowzCard row>
                <GlowzArt h={p.h} icon={providerIcon(p)} style={{ width: 44, height: 44, borderRadius: 22 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <GlowzText weight={600} numberOfLines={1}>{p.name}</GlowzText>
                  <GlowzText kind="small" muted={!u} weight={u ? 600 : 400} numberOfLines={1}>{m ? m[m.length - 1].t : 'Start a conversation'}</GlowzText>
                </View>
                {u ? <GlowzBadge label="New" /> : null}
              </GlowzCard>
            </Pressable>
          );
        }) : (
          <GlowzEmptyState title="No conversations yet" subtitle="Message a professional from their profile or a booking." action={<GlowzButton small label="Find a professional" onPress={goSearch} />} />
        )}
      </View>
    </GlowzScreen>
  );
}