import React from 'react';
import WoulibFlow from './WoulibFlow';

export default function WoulibStandaloneEntry(props: React.ComponentProps<typeof WoulibFlow>) {
  return <WoulibFlow {...props} />;
}
