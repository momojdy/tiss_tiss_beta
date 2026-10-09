import React from 'react';
import { WoulibFlow } from '../features/woulib/Woulib';

export default function WoulibHomeScreen({ onBack }: { onBack: () => void }) {
  return <WoulibFlow onBack={onBack} />;
}
