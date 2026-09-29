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
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const C = {
  bg: '#F3F1F2',
  card: '#FFFFFF',
  title: '#16181B',
  body: '#77747A',
  tint: '#FBE7ED',
  accent: '#A03A66',
  placeholder: '#B0688A',
  primary: '#C00088',
  link: '#A62B5E',
  error: '#D12D4F',
};

type ResetPasswordScreenProps = {
  onBack?: () => void;
  onUpdatePassword?: (password: string) => Promise<unknown>;
  onSignIn?: () => void;
};

export default function ResetPasswordScreen({
  onBack,
  onUpdatePassword,
  onSignIn,
}: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [obscurePassword, setObscurePassword] = useState(true);
  const [obscureConfirmPassword, setObscureConfirmPassword] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpdatePassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password) {
      setErrorMessage('Enter a new password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (!confirmPassword) {
      setErrorMessage('Confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!onUpdatePassword) {
      setErrorMessage('Password reset is not connected yet.');
      return;
    }

    try {
      setSaving(true);
      await onUpdatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setSuccessMessage('Your password has been updated. You can now sign in.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your password. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <View style={styles.center}>
        <View style={styles.card}>
          <Pressable
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={C.accent}
            />
          </Pressable>

          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.desc}>
            Choose a new password for your Wantiss account. Make sure it is
            something you can remember.
          </Text>

          <View style={styles.input}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color={C.accent}
            />
            <TextInput
              style={styles.inputText}
              value={password}
              onChangeText={text => {
                setPassword(text);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="New password"
              placeholderTextColor={C.placeholder}
              secureTextEntry={obscurePassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setObscurePassword(value => !value)}
              accessibilityRole="button"
              accessibilityLabel={obscurePassword ? 'Show password' : 'Hide password'}
            >
              <MaterialCommunityIcons
                name={obscurePassword ? 'eye-off-outline' : 'eye-outline'}
                size={21}
                color={C.accent}
              />
            </Pressable>
          </View>

          <View style={styles.input}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={20}
              color={C.accent}
            />
            <TextInput
              style={styles.inputText}
              value={confirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="Confirm new password"
              placeholderTextColor={C.placeholder}
              secureTextEntry={obscureConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setObscureConfirmPassword(value => !value)}
              accessibilityRole="button"
              accessibilityLabel={
                obscureConfirmPassword ? 'Show password' : 'Hide password'
              }
            >
              <MaterialCommunityIcons
                name={
                  obscureConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                }
                size={21}
                color={C.accent}
              />
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={styles.messageError}>{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text style={styles.messageSuccess}>{successMessage}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && !saving ? styles.buttonPressed : null,
              saving ? styles.buttonDisabled : null,
            ]}
            onPress={handleUpdatePassword}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Updating password...' : 'Update password'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.footerButton}
            onPress={onSignIn}
            disabled={saving}
          >
            <Text style={styles.footer}>
              Remember your password? <Text style={styles.link}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    color: C.title,
  },
  desc: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: C.body,
  },
  input: {
    marginTop: 16,
    height: 60,
    borderRadius: 20,
    backgroundColor: C.tint,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: C.title,
    padding: 0,
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageError: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: C.error,
  },
  messageSuccess: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#4B7A58',
  },
  button: {
    marginTop: 24,
    height: 60,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerButton: {
    marginTop: 22,
    alignItems: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 16,
    color: C.title,
  },
  link: {
    fontWeight: '600',
    color: C.link,
  },
});
