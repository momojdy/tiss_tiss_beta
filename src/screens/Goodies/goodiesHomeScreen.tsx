import React from 'react';
import { GoodiesApp } from '../../features/Goodies/GoodiesApp';

type GoodiesHomeScreenProps = {
  onBack: () => void;
};

/** Mounts Goodies inside Wantiss and returns to the existing home when exited. */
export default function GoodiesHomeScreen({ onBack }: GoodiesHomeScreenProps) {
  return <GoodiesApp embedded onExit={onBack} />;
}
