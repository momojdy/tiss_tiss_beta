import React from 'react';
import { WoulibFlow as WoulibFlowImpl } from './Woulib';

export default function WoulibFlow(props: React.ComponentProps<typeof WoulibFlowImpl>) {
  return <WoulibFlowImpl {...props} />;
}
