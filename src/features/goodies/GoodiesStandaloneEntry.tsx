import React from 'react';
import GoodiesHomeScreen from '../../screens/Goodies/goodiesHomeScreen';

export default function GoodiesStandaloneEntry(props: React.ComponentProps<typeof GoodiesHomeScreen>) {
  return <GoodiesHomeScreen {...props} />;
}
