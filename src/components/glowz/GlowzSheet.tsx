import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useGlowzTheme } from '../styles/ThemeContext';
import { useGutter, useInsets } from '../styles/LayoutContext';
import { radius, size } from '../styles/tokens';
import { GlowzIconButton } from './GlowzIconButton';
import { GlowzText } from './GlowzText';

interface Props {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Hide the close button (confirmation sheets without a title use their own buttons). */
  hideClose?: boolean;
}

/**
 * Bottom sheet on a native Modal. Android back, backdrop tap and the close button all call onClose.
 * The keyboard pushes the sheet up and the content scrolls when it is taller than 88% of the screen.
 */
export function GlowzSheet({ title, onClose, children, hideClose }: Props) {
  const { c } = useGlowzTheme();
  const insets = useInsets();
  const g = useGutter();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: c.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: '88%', width: '100%', maxWidth: size.contentMaxWidth, alignSelf: 'center' }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 22, paddingBottom: 22 + insets.bottom, paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
            {title || !hideClose ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>{title ? <GlowzText kind="display" size={24} numberOfLines={1} accessibilityRole="header">{title}</GlowzText> : null}</View>
                {!hideClose ? <GlowzIconButton icon="close" label="Close" onPress={onClose} /> : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
