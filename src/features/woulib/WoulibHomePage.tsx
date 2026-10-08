import React from 'react';
import { WoulibHomeScreen as WoulibHomeScreenImpl } from './Woulib';

export default function WoulibHomePage(props: React.ComponentProps<typeof WoulibHomeScreenImpl>) {
  return <WoulibHomeScreenImpl {...props} />;
}
