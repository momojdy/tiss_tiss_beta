import React from 'react';
import KonsolissHomeScreen from '../../screens/Konsoliss/konsolissHomeScreen';

export default function KonsolissStandaloneEntry(props: React.ComponentProps<typeof KonsolissHomeScreen>) {
  return <KonsolissHomeScreen {...props} />;
}
