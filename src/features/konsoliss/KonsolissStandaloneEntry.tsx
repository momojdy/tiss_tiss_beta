import React from 'react';
import KonsolissHomeScreen from '../../screens/Main/mainKonsolissHomeScreen';

export default function KonsolissStandaloneEntry(props: React.ComponentProps<typeof KonsolissHomeScreen>) {
  return <KonsolissHomeScreen {...props} />;
}
