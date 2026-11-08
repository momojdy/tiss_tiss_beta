import React from 'react';
import { GoodiesApp } from '../../features/Goodies/GoodiesApp';
import type {GoodiesMenuAction} from '../../features/Goodies/GoodiesQuickMenu';

type GoodiesHomeScreenProps = {
  onBack: () => void;
  onUniversalAction?: (action:GoodiesMenuAction)=>void;
  unreadNotifications?:number;
  unreadMessages?:number;
};

/** Mounts Goodies inside Wantiss and returns to the existing home when exited. */
export default function GoodiesHomeScreen({ onBack, onUniversalAction, unreadNotifications, unreadMessages }: GoodiesHomeScreenProps) {
  return <GoodiesApp embedded onExit={onBack} onUniversalAction={onUniversalAction} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} />;
}
