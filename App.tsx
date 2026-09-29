import React, { useState } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);

  if (authenticated) return <HomeScreen />;

  return (
    <AuthScreen
      onSignInPressed={async () => setAuthenticated(true)}
      onSignUpPressed={async (_email, _password, role) => {
        if (role === 'buyer') setAuthenticated(true);
      }}
    />
  );
}
