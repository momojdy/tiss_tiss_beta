import React from 'react';
import WoulibFlow from '../features/woulib/WoulibFlow';

export default function WoulibHomeScreen({ onBack }: { onBack?: () => void }) {
  return <WoulibFlow onClose={onBack} />;
}
