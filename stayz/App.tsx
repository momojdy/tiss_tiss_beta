import React from 'react';
import { Linking } from 'react-native';
import { StayzApp } from './src/StayzApp';

export default function App() {
  return (
    <StayzApp
      onOpenWallet={() => Linking.openURL('wantiss://wallet')}
      onExitToWantiss={() => Linking.openURL('wantiss://home')}
      onListProperty={() => Linking.openURL('wantiss://business/stayz')}
    />
  );
}
