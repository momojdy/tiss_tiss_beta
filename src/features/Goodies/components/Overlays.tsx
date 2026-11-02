import React from 'react';
import {Modal, View, Pressable, KeyboardAvoidingView, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/**
 * Shared overlay primitives for Goodies.
 * BottomSheet is the single modal shell for edge-attached content.
 * ConfirmDialog is the centered confirmation shell; callers own the actions/content.
 */
type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number | string;
};

export function BottomSheet({visible, onClose, children, maxHeight = '90%'}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'flex-end'}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />
          <View style={{width: '100%', maxHeight, paddingBottom: Math.max(0, insets.bottom), flexShrink: 1, minHeight: 0}}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmDialogProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
};

export function ConfirmDialog({visible, onClose, children, accessibilityLabel = 'Close confirmation'}: ConfirmDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 24}}>
        <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onClose} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} />
        <View style={{width: '100%', maxHeight: '80%', flexShrink: 1, minHeight: 0}}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
