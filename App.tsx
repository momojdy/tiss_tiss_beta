import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import WalletHomeScreen from './src/screens/WalletHomeScreen';
import WalletNotificationsScreen from './src/screens/WalletNotificationsScreen';
import WalletSettingsScreen from './src/screens/WalletSettingsScreen';
import WalletPaymentMethodsScreen from './src/screens/WalletPaymentMethodsScreen';
import WalletBankCardsScreen from './src/screens/WalletBankCardsScreen';
import WalletAddNewCardScreen from './src/screens/WalletAddNewCardScreen';
import WalletPersonalInfoScreen from './src/screens/WalletPersonalInfoScreen';
import { supabase } from './src/lib/supabase';

type Screen = 'auth' | 'forgot' | 'reset';
type BuyerScreen = 'home' | 'me' | 'wallet' | 'walletNotifications' | 'walletSettings' | 'walletPersonalInfo' | 'walletPaymentMethods' | 'walletBankCards' | 'walletAddNewCard';

type AppErrorProps = { title: string; error: unknown };

function AppError({ title, error }: AppErrorProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View style={{ flex: 1, backgroundColor: '#F3F1F2', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#16181B', marginBottom: 12, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 14, color: '#77747A', textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });

  const [screen, setScreen] = useState<Screen>('auth');
  const [authenticated, setAuthenticated] = useState(false);
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>('home');

  useEffect(() => {
    let mounted = true;
    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return;
      const parsed = Linking.parse(url);
      const path = parsed.path ?? '';
      const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
      if (!path.includes('reset-password') && !code) return;
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        if (mounted) setScreen('reset');
      } catch (error) {
        if (mounted) {
          setScreen('auth');
          console.error('Password reset link error:', error);
        }
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => { mounted = false; subscription.remove(); };
  }, []);

  if (!fontsLoaded) return null;

  if (authenticated) {
    try {
      if (buyerScreen === 'walletAddNewCard') {
        return <WalletAddNewCardScreen onBack={() => setBuyerScreen('walletBankCards')} />;
      }

      if (buyerScreen === 'walletBankCards') {
        return (
          <WalletBankCardsScreen
            onBack={() => setBuyerScreen('walletPaymentMethods')}
            onAddCardPress={() => setBuyerScreen('walletAddNewCard')}
          />
        );
      }

      if (buyerScreen === 'walletPersonalInfo') {
        return <WalletPersonalInfoScreen onBack={() => setBuyerScreen('walletSettings')} />;
      }

      if (buyerScreen === 'walletPaymentMethods') {
        return (
          <WalletPaymentMethodsScreen
            onBack={() => setBuyerScreen('walletSettings')}
            onBankCardPress={() => setBuyerScreen('walletBankCards')}
          />
        );
      }

      if (buyerScreen === 'walletSettings') {
        return (
          <WalletSettingsScreen
            onBack={() => setBuyerScreen('wallet')}
            onHomePress={() => setBuyerScreen('wallet')}
            onNotificationsPress={() => setBuyerScreen('walletNotifications')}
            onPersonalInfoPress={() => setBuyerScreen('walletPersonalInfo')}
            onPaymentMethodsPress={() => setBuyerScreen('walletPaymentMethods')}
          />
        );
      }

      if (buyerScreen === 'walletNotifications') {
        return (
          <WalletNotificationsScreen
            onBack={() => setBuyerScreen('wallet')}
            onPayMoneyRequest={(requestId) => {
              console.info('Pay money request:', requestId);
            }}
          />
        );
      }

      if (buyerScreen === 'wallet') {
        return (
          <WalletHomeScreen
            onBack={() => setBuyerScreen('me')}
            onHomePress={() => setBuyerScreen('home')}
            onMePress={() => setBuyerScreen('walletSettings')}
            onNotificationsPress={() => setBuyerScreen('walletNotifications')}
          />
        );
      }

      if (buyerScreen === 'me') {
        const MeScreen = require('./src/screens/MeScreen').default;
        return <MeScreen onHomePress={() => setBuyerScreen('home')} onWalletPress={() => setBuyerScreen('wallet')} />;
      }

      const HomeScreen = require('./src/screens/HomeScreen').default;
      return <HomeScreen onMePress={() => setBuyerScreen('me')} />;
    } catch (error) {
      return <AppError title="Home could not load" error={error} />;
    }
  }

  if (screen === 'forgot') {
    return (
      <ForgotPasswordScreen
        onBack={() => setScreen('auth')}
        onSignIn={() => setScreen('auth')}
        onSendResetLink={async email => {
          const redirectTo = Linking.createURL('reset-password');
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
          if (error) throw error;
        }}
      />
    );
  }

  if (screen === 'reset') {
    return (
      <ResetPasswordScreen
        onBack={() => setScreen('auth')}
        onSignIn={() => setScreen('auth')}
        onUpdatePassword={async password => {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          await supabase.auth.signOut();
          setScreen('auth');
        }}
      />
    );
  }

  return (
    <AuthScreen
      onSignInPressed={async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (!data.user) throw new Error('No user returned from Supabase.');
          setAuthenticated(true);
        } catch (error) {
          console.error('SIGN IN ERROR:', error);
        }
      }}
      onForgotPasswordPressed={async email => {
        const redirectTo = Linking.createURL('reset-password');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      }}
      onForgotPasswordScreenPressed={() => setScreen('forgot')}
      onSignUpPressed={async (email, password, role, fullName, businessName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, full_name: fullName || null, business_name: businessName || null } },
        });
        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }
        if (data.session) {
          if (role === 'buyer') setAuthenticated(true);
          else {
            await supabase.auth.signOut();
            throw new Error('B&P 2P home is not connected yet.');
          }
          return;
        }
        if (data.user && !data.session) throw new Error('This email is already registered. Please sign in instead.');
        throw new Error('Unable to create your account. Please try again.');
      }}
    />
  );
}
