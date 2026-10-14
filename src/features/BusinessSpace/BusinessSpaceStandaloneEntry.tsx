import React from 'react';
import BusinessSpaceScreen from '../../screens/businessSpace/BusinessSpaceScreen';

export default function BusinessSpaceStandaloneEntry(props: React.ComponentProps<typeof BusinessSpaceScreen>) {
  return <BusinessSpaceScreen {...props} />;
}
