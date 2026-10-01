import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import HomeScreen from './src/screens/HomeScreen';
import MeScreen from './src/screens/MeScreen';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { supabase } from './src/lib/supabase';

type Screen = 'auth' | 'forgot' | 'reset';

class HomeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('HomeScreen render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#14181B', marginBottom: 12 }}>
            Home screen error
          </Text>
          <Text style={{ fontSize: 14, color: '#14181B' }}>
            {this.state.error.message || String(this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [authenticated, setAuthenticated] = useState(false);
  const [buyerScreen, setBuyerScreen] = useState<'home' | 'me'>('home');

  useEffect(() => {
    let mounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url || !mounted) return;

      const parsed = Linking.parse(url);
      const path = parsed.path ?? '';
      const code =
        typeof parsed.queryParams?.code === 'string'
          ? parsed.queryParams.code
          : null;

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

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (authenticated) {
    if (buyerScreen === 'me') {
      return <MeScreen onHomePress={() => setBuyerScreen('home')} />;
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <HomeErrorBoundary>
          <HomeScreen onMePress={() => setBuyerScreen('me')} />
        </HomeErrorBoundary>
      </View>
    );
  }

  if (screen === 'forgot') {
    return (
      <ForgotPasswordScreen
        onBack={() => setScreen('auth')}
        onSignIn={() => setScreen('auth')}
        onSendResetLink={async email => {
          const redirectTo = Linking.createURL('reset-password');
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
          });
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('No user returned.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          await supabase.auth.signOut();
          throw profileError;
        }

        if (profile?.role !== 'buyer') {
          await supabase.auth.signOut();
          throw new Error('B&P 2P home is not connected yet.');
        }

        console.log('SIGN_IN_SUCCESS', {
          userId: data.user.id,
          role: profile?.role,
        });
        setAuthenticated(true);
      }}
      onForgotPasswordPressed={async email => {
        const redirectTo = Linking.createURL('reset-password');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
      }}
      onForgotPasswordScreenPressed={() => setScreen('forgot')}
      onSignUpPressed={async (email, password, role, fullName, businessName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName || null,
              business_name: businessName || null,
            },
          },
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }

        if (data.session) {
          if (role === 'buyer') {
            setAuthenticated(true);
          } else {
            await supabase.auth.signOut();
            throw new Error('B&P 2P home is not connected yet.');
          }
          return;
        }

        if (data.user && !data.session) {
          throw new Error('This email is already registered. Please sign in instead.');
        }

        throw new Error('Unable to create your account. Please try again.');
      }}
    />
  );
}
