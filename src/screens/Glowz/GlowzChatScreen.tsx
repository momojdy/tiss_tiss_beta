import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useChat } from '../hooks/useChat';
import { useGlowzNav } from '../navigation/GlowzNavigationContext';
import { useGutter } from '../styles/LayoutContext';
import { useGlowzTheme } from '../styles/ThemeContext';
import { GlowzButton } from '../components/GlowzButton';
import { GlowzEmptyState } from '../components/GlowzEmptyState';
import { GlowzScreen } from '../components/GlowzScreen';
import { GlowzStickyBar } from '../components/GlowzStickyBar';
import { GlowzText } from '../components/GlowzText';
import { GlowzTextField } from '../components/GlowzTextField';
import { GlowzTopBar } from '../components/GlowzTopBar';
import type { ChatMessage } from '../types/state';
import { getProvider } from '../utils/catalog';

const WELCOME: ChatMessage[] = [{ me: 0, auto: 1, t: 'Hi! Ask us anything about your booking.' }];

export function GlowzChatScreen({ providerId }: { providerId: string }) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const nav = useGlowzNav();
  const { chat, send } = useChat();
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);
  const p = getProvider(providerId);
  const messages = chat[providerId] ?? WELCOME;

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  if (!p) {
    return (
      <GlowzScreen header={<GlowzTopBar title="Messages" onBack={nav.back} />}>
        <GlowzEmptyState title="Conversation unavailable" subtitle="This professional is no longer on Glowz." action={<GlowzButton small label="Go back" onPress={nav.back} />} />
      </GlowzScreen>
    );
  }
  const submit = () => { if (send(providerId, text)) setText(''); };

  const bar = (
    <GlowzStickyBar>
      <GlowzTextField value={text} onChangeText={setText} placeholder="Write a message" accessibilityLabel="Message" style={{ flex: 1 }} returnKeyType="send" onSubmitEditing={submit} blurOnSubmit={false} />
      <GlowzButton small label="Send" onPress={submit} style={{ height: 46 }} />
    </GlowzStickyBar>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlowzScreen header={<GlowzTopBar title={p.name} onBack={nav.back} />} bar={bar} scrollRef={scroll}>
        <View style={{ paddingLeft: g.left, paddingRight: g.right, gap: 8, paddingBottom: 0 }}>
          {messages.map((m, i) => (
            <View
              key={i}
              style={{
                maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1,
                alignSelf: m.me ? 'flex-end' : 'flex-start', backgroundColor: m.me ? c.accent : c.surface, borderColor: m.me ? c.accent : c.line,
              }}
            >
              {m.auto ? <GlowzText kind="tiny" muted style={{ marginBottom: 2 }}>Sample auto-reply</GlowzText> : null}
              <GlowzText color={m.me ? c.accentInk : c.ink}>{m.t}</GlowzText>
            </View>
          ))}
          <GlowzText kind="small" muted center>Replies here are automatic samples. Keep payments inside Glowz. Never send card details or pay a provider outside the app.</GlowzText>
        </View>
      </GlowzScreen>
    </KeyboardAvoidingView>
  );
}
