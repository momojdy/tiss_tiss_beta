import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardTypeOptions,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ForgotPasswordScreen from './ForgotPasswordScreen';

const PINK = '#BF008E';
const TOGGLE_BG = '#E0E3E7';
const TOGGLE_TEXT_OFF = '#949090';
const FIELD_BG = '#FBE8EF';
const FIELD_TEXT = '#9A4B68';
const LINK = '#9D315B';
const DARK = '#14181B';
const PAGE_BG = '#F1F4F8';
const RED = '#FF0000';

const LOGO_URL = 'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG';
const GOOGLE_PNG = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.png';

type AuthCardProps = {
  onSignInPressed?: (email: string, password: string) => Promise<unknown>;
  onSignUpPressed?: (email: string, password: string, role: string, fullName: string, businessName: string) => Promise<unknown>;
  onGooglePressed?: () => Promise<unknown>;
  onApplePressed?: () => Promise<unknown>;
  onForgotPasswordPressed?: (email: string) => Promise<unknown>;
  onForgotPasswordScreenPressed?: () => void;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type AuthFieldProps = {
  top: number;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon: IconName;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  secureTextEntry?: boolean;
  suffix?: React.ReactNode;
};

function AuthField({ top, value, onChangeText, placeholder, icon, error, keyboardType, autoCapitalize, secureTextEntry, suffix }: AuthFieldProps) {
  return (
    <View style={{ paddingTop: top, paddingBottom: 8, paddingHorizontal: 8 }}>
      <View style={[styles.fieldBox, error ? { borderWidth: 1, borderColor: RED } : null]}>
        <View style={styles.fieldInner}>
          <View style={styles.prefixIcon}><MaterialCommunityIcons name={icon} size={24} color={FIELD_TEXT} /></View>
          <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={FIELD_TEXT} keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? 'none'} autoCorrect={false} secureTextEntry={secureTextEntry} style={styles.textInput} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit />
          {suffix}
        </View>
      </View>
      {error ? <Text style={[styles.fieldError, { marginTop: 5 }]}>{error}</Text> : null}
    </View>
  );
}

function WantissAuthCard({ onSignInPressed, onSignUpPressed, onGooglePressed, onApplePressed, onForgotPasswordPressed, onForgotPasswordScreenPressed }: AuthCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isVendor, setIsVendor] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);
  const [registerStep, setRegisterStep] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleFailed, setGoogleFailed] = useState(false);

  const pagerRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, screenWidth - 60);
  const isValidEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

  const dismissKeyboard = () => Keyboard.dismiss();

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setFullNameError(null);
    setErrorMessage(null);
  };

  const toggleRegisterMode = () => {
    setIsRegisterMode(v => !v);
    setRegisterStep(0);
    clearErrors();
    pagerRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  };

  const toggleRole = () => {
    setIsVendor(v => !v);
    setRegisterStep(0);
    clearErrors();
    pagerRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  };

  const goToRegisterStep = (step: number) => {
    setRegisterStep(step);
    clearErrors();
    pagerRef.current?.scrollTo({ x: step * pageWidth, y: 0, animated: true });
  };

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (index !== registerStep) {
      setRegisterStep(index);
      clearErrors();
    }
  };

  const handleRegisterNext = () => {
    if (!fullName.trim()) {
      setFullNameError('Full Name is required.');
      return;
    }
    setFullNameError(null);
    setErrorMessage(null);
    goToRegisterStep(1);
  };

  const handleSubmit = async () => {
    clearErrors();
    if (isRegisterMode && isVendor && registerStep === 0) {
      handleRegisterNext();
      return;
    }

    const trimmedEmail = email.trim();
    let hasError = false;
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    }
    if (hasError) return;

    if (!isRegisterMode) {
      if (!onSignInPressed) {
        setErrorMessage('Sign in action is not connected.');
        return;
      }
      try {
        await onSignInPressed(trimmedEmail, password);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
      }
      return;
    }

    if (!onSignUpPressed) {
      setErrorMessage('Sign up action is not connected.');
      return;
    }

    try {
      await onSignUpPressed(trimmedEmail, password, isVendor ? 'business' : 'buyer', isVendor ? fullName.trim() : '', isVendor ? businessName.trim() : '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
    }
  };

  const renderToggle = () => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleOuter}>
        <View style={styles.toggleInner}>
          <Pressable style={[styles.toggleHalf, !isVendor && { backgroundColor: PINK }]} onPress={() => isVendor && toggleRole()}>
            <Text style={[styles.toggleText, { color: !isVendor ? '#FFFFFF' : TOGGLE_TEXT_OFF }]}>Buyer</Text>
          </Pressable>
          <Pressable style={[styles.toggleHalf, isVendor && { backgroundColor: PINK }]} onPress={() => !isVendor && toggleRole()}>
            <Text style={[styles.toggleText, { color: isVendor ? '#FFFFFF' : TOGGLE_TEXT_OFF }]}>B&P 2P</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderBusinessSpaceLabel = () => isVendor ? <View style={styles.businessLabelBox}><Text style={styles.businessLabelText}>Business Space</Text></View> : null;

  const renderRegisterStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, { backgroundColor: registerStep === 0 ? PINK : TOGGLE_BG }]} />
      <View style={{ width: 7 }} />
      <View style={[styles.stepDot, { backgroundColor: registerStep === 1 ? PINK : TOGGLE_BG }]} />
    </View>
  );

  const renderEmailField = () => <AuthField top={15} value={email} onChangeText={t => { setEmail(t); if (emailError) setEmailError(null); }} placeholder="Email" icon="email-outline" error={emailError} keyboardType="email-address" />;

  const renderPasswordField = () => (
    <AuthField top={12} value={password} onChangeText={t => { setPassword(t); if (passwordError) setPasswordError(null); }} placeholder="Password" icon="lock-outline" error={passwordError} secureTextEntry={obscurePassword}
      suffix={<Pressable style={styles.suffixButton} onPress={() => setObscurePassword(v => !v)}><MaterialCommunityIcons name={obscurePassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={FIELD_TEXT} /></Pressable>}
    />
  );

  const renderFullNameField = () => <AuthField top={15} value={fullName} onChangeText={t => { setFullName(t); if (fullNameError) setFullNameError(null); }} placeholder="Full Name" icon="account-outline" error={fullNameError} autoCapitalize="words" />;
  const renderBusinessNameField = () => <AuthField top={12} value={businessName} onChangeText={setBusinessName} placeholder="Business Name (optional)" icon="office-building-outline" autoCapitalize="words" />;

  const renderForgotPassword = () => (
    <View style={styles.forgotRow}>
      <Pressable accessibilityRole="button" style={styles.forgotButton} onPress={() => onForgotPasswordScreenPressed?.()}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>
    </View>
  );

  const renderSubmitButton = (text: string) => (
    <View style={styles.submitWrap}>
      <Pressable accessibilityRole="button" style={styles.submitButton} onPress={handleSubmit}>
        <View style={styles.submitContent}><Text style={styles.submitText}>{text}</Text>{text === 'Next' ? <MaterialCommunityIcons name="arrow-right" size={22} color="#FFFFFF" /> : null}</View>
      </Pressable>
    </View>
  );

  const renderSocialButtons = () => (
    <View style={styles.socialRow}>
      <Pressable style={styles.socialButton} onPress={() => onGooglePressed?.()}>{googleFailed ? <Text style={styles.googleFallback}>G</Text> : <Image source={{ uri: GOOGLE_PNG }} style={{ width: 22, height: 22 }} onError={() => setGoogleFailed(true)} />}</Pressable>
      <View style={{ width: 90 }} />
      <Pressable style={styles.socialButton} onPress={() => onApplePressed?.()}><MaterialCommunityIcons name="apple" size={25} color="#000000" /></Pressable>
    </View>
  );

  const renderCredentialsBlock = (submitText: string) => <View>{renderEmailField()}{renderPasswordField()}{renderForgotPassword()}{renderSocialButtons()}{renderSubmitButton(submitText)}</View>;

  const renderBusinessRegistrationPages = () => (
    <View style={{ width: '100%', height: 365, overflow: 'hidden' }}>
      <ScrollView ref={pagerRef} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" onMomentumScrollEnd={onPagerScrollEnd} style={{ width: '100%', height: 365 }}>
        <View style={{ width: pageWidth, height: 365 }}>{renderFullNameField()}{renderBusinessNameField()}{renderSubmitButton('Next')}</View>
        <View style={{ width: pageWidth, height: 365 }}>{renderCredentialsBlock('Sign Up')}</View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.card}>
        <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onTouchStart={dismissKeyboard}>
          {renderToggle()}
          {renderBusinessSpaceLabel()}
          {isRegisterMode && isVendor ? renderRegisterStepIndicator() : null}
          {isRegisterMode && isVendor ? renderBusinessRegistrationPages() : isRegisterMode ? renderCredentialsBlock('Sign Up') : renderCredentialsBlock('Sign in')}
          {errorMessage ? <View style={styles.errorMessageWrap}><Text style={styles.fieldError}>{errorMessage}</Text></View> : null}
        </ScrollView>
      </View>
      <Pressable style={styles.bottomSwitch} onPress={toggleRegisterMode}>
        <Text style={styles.bottomSwitchText}>{isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}<Text style={styles.bottomSwitchLink}>{isRegisterMode ? 'Sign in' : 'Register'}</Text></Text>
      </Pressable>
    </View>
  );
}

type AuthScreenProps = AuthCardProps;

export default function AuthScreen({ onSignInPressed, onSignUpPressed, onGooglePressed, onApplePressed, onForgotPasswordPressed, onForgotPasswordScreenPressed }: AuthScreenProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [showForgot, setShowForgot] = useState(false);
  const headerTop = ((screenHeight - 356) / 2) * (-1.03 + 1);

  if (showForgot) {
    return (
      <ForgotPasswordScreen
        onBack={() => setShowForgot(false)}
        onSignIn={() => setShowForgot(false)}
        onSendResetLink={onForgotPasswordPressed}
      />
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <LinearGradient colors={['#F7DDEB', '#FBEAF3', '#FFF5E9']} locations={[0, 0.85, 0.925]} start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }} style={[styles.header, { top: headerTop }]} pointerEvents="none">
        <View style={styles.logoBox}><Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" /></View>
      </LinearGradient>
      <View style={styles.cardPosition}>
        <WantissAuthCard
          onSignInPressed={onSignInPressed}
          onSignUpPressed={onSignUpPressed}
          onGooglePressed={onGooglePressed}
          onApplePressed={onApplePressed}
          onForgotPasswordPressed={onForgotPasswordPressed}
          onForgotPasswordScreenPressed={() => {
            setShowForgot(true);
            onForgotPasswordScreenPressed?.();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  header: { position: 'absolute', left: 0, right: 0, height: 356 },
  logoBox: { flex: 1, paddingLeft: 10, paddingTop: 50, paddingRight: 30, paddingBottom: 25 },
  logo: { width: '100%', height: '100%', borderRadius: 8 },
  cardPosition: { position: 'absolute', top: 300, left: 15, right: 15, zIndex: 10 },
  card: { width: '100%', height: 470, backgroundColor: '#FFFFFF', borderRadius: 20, paddingLeft: 15, paddingRight: 15, paddingTop: 24, overflow: 'hidden' },
  toggleRow: { width: '100%', paddingLeft: 8, paddingRight: 8 },
  toggleOuter: { width: '100%', height: 50 },
  toggleInner: { flex: 1, flexDirection: 'row', backgroundColor: TOGGLE_BG, borderWidth: 1, borderColor: TOGGLE_BG, borderRadius: 12, padding: 2 },
  toggleHalf: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 16, fontWeight: '600' },
  businessLabelBox: { height: 25, justifyContent: 'center', alignItems: 'center', paddingLeft: '50%' },
  businessLabelText: { fontSize: 13, color: RED },
  stepIndicator: { paddingTop: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  stepDot: { width: 7, height: 7, borderRadius: 3.5 },
  fieldBox: { height: 60, backgroundColor: FIELD_BG, borderRadius: 15 },
  fieldInner: { flex: 1, marginTop: 11, marginLeft: 2, flexDirection: 'row', alignItems: 'center' },
  prefixIcon: { width: 48, alignItems: 'center', justifyContent: 'center' },
  suffixButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, height: '100%', padding: 0, fontSize: 18, fontWeight: '400', color: FIELD_TEXT },
  fieldError: { fontSize: 13, fontWeight: '500', color: RED },
  forgotRow: { paddingTop: 8, paddingLeft: 15, paddingRight: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  forgotButton: { padding: 8 },
  forgotText: { fontSize: 14, fontWeight: '600', color: LINK },
  submitWrap: { paddingLeft: 15, paddingRight: 15, paddingTop: 20 },
  submitButton: { width: '100%', height: 60, backgroundColor: PINK, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  submitContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  socialRow: { paddingTop: 30, flexDirection: 'row', justifyContent: 'center' },
  socialButton: { width: 100, height: 50, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: FIELD_TEXT, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  googleFallback: { fontSize: 22, fontWeight: '600', color: '#4B39EF' },
  errorMessageWrap: { paddingTop: 5, paddingLeft: 15, paddingRight: 15, alignItems: 'flex-start' },
  bottomSwitch: { paddingTop: 5, paddingBottom: 10, alignItems: 'center' },
  bottomSwitchText: { textAlign: 'center', fontSize: 15, fontWeight: '400', color: DARK },
  bottomSwitchLink: { fontSize: 14.5, fontWeight: '600', color: LINK },
});
