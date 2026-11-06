import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { useGlowzTheme } from '../../styles/Glowz/ThemeContext';
import { useGutter, useInsets } from '../../styles/Glowz/LayoutContext';
import { radius, size } from '../../styles/Glowz/tokens';
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
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_: any, gesture: any) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_: any, gesture: any) => { if (gesture.dy > 65 || gesture.vy > 1.1) onClose(); },
  }), [onClose]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: c.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: '88%', width: '100%', maxWidth: size.contentMaxWidth, alignSelf: 'center' }}
        >
          <View {...pan.panHandlers} style={{ height: 22 }} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 0, paddingBottom: 22 + insets.bottom, paddingLeft: g.left, paddingRight: g.right, gap: 14 }}>
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
