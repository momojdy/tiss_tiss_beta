import React from 'react';
import WoulibFlow from '../../screens/woulib/WoulibFlow';

export default function WoulibStandaloneEntry(props: React.ComponentProps<typeof WoulibFlow>) {
  return <WoulibFlow {...props} />;
}
