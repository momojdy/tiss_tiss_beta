import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzStateView } from './stayzStates';
import { StayzTxt } from './stayzTxt';
import { fmtTime } from './stayzDates';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzTheme } from './stayzThemeContext';
import { ChatMessage } from './stayzTypes';

export const StayzChatScreen = ({ route }: RootProps<'Chat'>) => {
  const { id, title } = route.params;
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.listMessages(id));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Messages could not be loaded');
    }
  }, [api, id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await api.sendMessage(id, body);
      setItems(prev => [...prev, m]);
      setText('');
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    } catch {
      setError('Your message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <StayzScreen title={title} scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        {error && items.length === 0 ? (
          <StayzErrorView message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <StayzStateView icon="chatbubble-ellipses-outline" title="Start the conversation" body="Ask the property about check-in, parking or anything else." />
        ) : (
          <FlatList
            ref={list}
            data={items}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.mine ? { alignSelf: 'flex-end', backgroundColor: colors.brand } : { alignSelf: 'flex-start', backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1 }]}>
                <StayzTxt color={item.mine ? colors.onBrand : colors.text}>{item.body}</StayzTxt>
                <StayzTxt v="caption" color={item.mine ? colors.onBrand : colors.sub} style={{ opacity: 0.8 }}>
                  {fmtTime(`${new Date(item.createdAt).getHours()}:${new Date(item.createdAt).getMinutes()}`)}
                </StayzTxt>
              </View>
            )}
          />
        )}
        <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.line }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={colors.sub} multiline style={[styles.input, { backgroundColor: colors.chip, color: colors.text }]} />
          <Pressable accessibilityLabel="Send" onPress={send} disabled={!text.trim() || sending} style={[styles.send, { backgroundColor: colors.brand, opacity: text.trim() ? 1 : 0.4 }]}>
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </StayzScreen>
  );
};

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, gap: 2 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
