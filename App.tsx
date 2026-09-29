import React, { useState } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import { supabase } from './src/lib/supabase';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);

  if (authenticated) return <HomeScreen />;

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

        setAuthenticated(true);
      }}
      onForgotPasswordPressed={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      }}
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
