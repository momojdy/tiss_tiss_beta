import React from 'react';
import { Pressable, View } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzCard } from '../components/GlowzCard';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzText } from '../components/GlowzText';
import { GlowzTopBar } from '../components/GlowzTopBar';

export function GlowzNotificationsScreen() {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const n = useNotifications();
  const right = (
    <Pressable onPress={n.markAllRead} disabled={!n.unreadCount} accessibilityRole="button" accessibilityLabel="Mark all read" hitSlop={8} style={{ opacity: n.unreadCount ? 1 : 0.4 }}>
      <GlowzText kind="small" weight={600} color={c.roseInk}>Mark all read</GlowzText>
    </Pressable>
  );
  return (
    <GlowzScreen header={<GlowzTopBar title="Notifications" onBack={nav.back} right={right} />}>
      <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 8 }}>
        {n.visible.length ? (
          n.visible.map(({ n: note, index }) => (
            <Pressable key={index} onPress={() => n.open(index)} accessibilityRole="button" accessibilityLabel={`${note.u ? 'Unread. ' : ''}${note.t}. ${note.s}`}>
              <GlowzCard row>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: note.u ? c.accent : 'transparent' }} />
                <View style={{ flex: 1 }}>
                  <GlowzText weight={note.u ? 600 : 500}>{note.t}</GlowzText>
                  <GlowzText kind="small" muted>{note.s}</GlowzText>
                </View>
                <GlowzText muted>›</GlowzText>
              </GlowzCard>
            </Pressable>
          ))
        ) : (
          <GlowzEmptyState title="No notifications" subtitle="Booking updates and offers show up here." />
        )}
      </View>
    </GlowzScreen>
  );
}