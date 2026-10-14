import React from 'react';
import FlyzHomeScreen from '../../screens/Flyz/FlyzHomeScreen';

export default function FlyzStandaloneEntry(props: React.ComponentProps<typeof FlyzHomeScreen>) {
  return <FlyzHomeScreen {...props} />;
}
