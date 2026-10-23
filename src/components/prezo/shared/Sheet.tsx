import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { useLayoutMode } from '../../../lib/prezo/useLayoutMode';
import { prezoLayout } from '../../../theme/prezoTheme';
import { Icon } from './Icon';
import { PzText } from './PzText';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
}

export const Sheet = ({ visible, onClose, title, children, dismissible = true }: SheetProps) => {
  const { colors } = usePrezoTheme();
  const insets = useSafeAreaInsets();
  const { isWide, height } = useLayoutMode();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissible ? onClose : undefined}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { justifyContent: isWide ? 'center' : 'flex-end' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={dismissible ? onClose : undefined}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.s1,
              borderColor: colors.ln,
              maxHeight: height * 0.88,
              borderBottomLeftRadius: isWide ? 24 : 0,
              borderBottomRightRadius: isWide ? 24 : 0,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: 26,
              paddingHorizontal: 22,
              paddingBottom: 26 + insets.bottom,
            }}
          >
            {title ? (
              <PzText display={700} size={20} accessibilityRole="header" style={styles.title}>
                {title}
              </PzText>
            ) : null}
            {children}
          </ScrollView>
          {dismissible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.close}
            >
              <Icon name="close" size={22} color={colors.mu} strokeWidth={1.6} />
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const SheetActions = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.actions}>{children}</View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    borderWidth: prezoLayout.hairline,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  title: {
    marginBottom: 6,
    paddingRight: 36,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
});

