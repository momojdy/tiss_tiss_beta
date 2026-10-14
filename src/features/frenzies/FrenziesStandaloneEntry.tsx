import React from 'react';
import FrenziesHomeScreen from '../../screens/Frenzies/FrenziesHomeScreen';

export default function FrenziesStandaloneEntry(props: React.ComponentProps<typeof FrenziesHomeScreen>) {
  return <FrenziesHomeScreen {...props} />;
}
