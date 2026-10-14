import React from 'react';
import GoodiesHomeScreen from '../../screens/Main/mainGoodiesHomeScreen';

export default function GoodiesStandaloneEntry(props: React.ComponentProps<typeof GoodiesHomeScreen>) {
  return <GoodiesHomeScreen {...props} />;
}
