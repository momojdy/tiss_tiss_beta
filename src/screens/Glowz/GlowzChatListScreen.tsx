import React from 'react';
import { Pressable, View } from 'react-native';
import { PROVIDERS } from '../../data/glowz/providers';
import { useGlowzState } from '../../hooks/Glowz/GlowzStore';
import { useChat } from '../../hooks/Glowz/useChat';
import { useGlowzCommands } from '../../hooks/Glowz/useGlowzCommands';
import { useGlowzNav } from '../../navigation/glowz/GlowzNavigationContext';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { GlowzArt } from '../../components/glowz/GlowzArt';
import { GlowzBadge } from '../../components/glowz/GlowzBadge';
import { GlowzButton } from '../../components/glowz/GlowzButton';
import { GlowzCard } from '../../components/glowz/GlowzCard';
import { GlowzEmptyState } from '../../components/glowz/GlowzEmptyState';
import { GlowzScreen } from '../../components/glowz/GlowzScreen';
import { GlowzText } from '../../components/glowz/GlowzText';
import { GlowzTopBar } from '../../components/glowz/GlowzTopBar';
import { providerIcon } from '../../util/Glowz/catalog';

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
