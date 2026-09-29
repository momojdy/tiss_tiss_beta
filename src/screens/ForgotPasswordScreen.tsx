import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PINK = '#C00088';
const PAGE_BG = '#F3F1F2';
const FIELD_BG = '#FBE7ED';
const FIELD_ICON = '#A03A66';
const TEXT = '#16181B';
const MUTED = '#77747A';
const LINK = '#A62B5E';

export type ForgotPasswordScreenProps = {
  onBack?: () => void;
  onSendResetLink?: (email: string) => Promise<unknown>;
  onSignIn?: () => void;
};

export default function ForgotPasswordScreen({
  onBack,
  onSendResetLink,
  onSignIn,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();

    if (!trimmed) {
      setErrorMessage('Enter your email address.');
      setSuccessMessage(null);
      return;
    }

    if (!/^\\S+@\\S+\\.\\S+$/.test(trimmed)) {
      setErrorMessage('Enter a valid email address.');
      setSuccessMessage(null);
      return;
    }

    if (!onSendResetLink) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await onSendResetLink(trimmed);
      setSuccessMessage('Reset link sent. Check your inbox.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send reset link. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="arrow-left" size={21} color={FIELD_ICON} />
          </Pressable>

          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.description}>
            Enter the email address linked to your Wantiss account and we’ll send
            you a secure link to reset your password.
          </Text>

          <View style={styles.field}>
            <MaterialCommunityIcons
              name="email-outline"
              size={22}
              color={FIELD_ICON}
            />
            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="Email address"
              placeholderTextColor="#A88A96"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={submit}
              style={styles.input}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? (
            <Text style={styles.success}>{successMessage}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send reset link"
            disabled={loading}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitPressed,
              loading && styles.disabled,
            ]}
          >
            <Text style={styles.submitText}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Pressable onPress={onSignIn}>
              <Text style={styles.signIn}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pressed: {
    opacity: 0.75,
  },
  title: {
    color: TEXT,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 22,
  },
  field: {
    height: 60,
    borderRadius: 20,
    backgroundColor: FIELD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    color: FIELD_ICON,
    fontSize: 16,
    marginLeft: 11,
    paddingVertical: 0,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 9,
    marginHorizontal: 4,
  },
  success: {
    color: '#237A57',
    fontSize: 13,
    marginTop: 9,
    marginHorizontal: 4,
  },
  submitButton: {
    height: 60,
    borderRadius: 20,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitPressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    color: TEXT,
    fontSize: 14,
  },
  signIn: {
    color: LINK,
    fontSize: 14,
    fontWeight: '600',
  },
});
