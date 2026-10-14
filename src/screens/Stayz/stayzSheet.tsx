import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStayzTheme } from './stayzThemeContext';
import { StayzTxt } from './stayzTxt';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const StayzSheet = ({ visible, title, onClose, children }: Props) => {
  const { colors } = useStayzTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.fill, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.grab, { backgroundColor: colors.line }]} />
          <StayzTxt v="h2" style={styles.title}>
            {title}
          </StayzTxt>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  title: { marginBottom: 12 },
  body: { paddingBottom: 12, gap: 12 },
});
