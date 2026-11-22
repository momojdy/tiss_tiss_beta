import React, {useEffect, useRef} from 'react';
import { GoodiesApp } from '../../features/Goodies/GoodiesApp';
import type {GoodiesMenuAction} from '../../features/Goodies/GoodiesQuickMenu';

type GoodiesHomeScreenProps = {
  onBack: () => void;
  onUniversalAction?: (action:GoodiesMenuAction)=>void;
  unreadNotifications?:number;
  unreadMessages?:number;
  initialRoute?:string;
  onInitialRouteConsumed?:() => void;
};

/** Mounts Goodies inside Wantiss and returns to the existing home when exited. */
export default function GoodiesHomeScreen({ onBack, onUniversalAction, unreadNotifications, unreadMessages, initialRoute, onInitialRouteConsumed }: GoodiesHomeScreenProps) {
  const entryRoute = useRef(initialRoute), consumeEntry = useRef(onInitialRouteConsumed);
  useEffect(() => { consumeEntry.current?.(); }, []);
  return <GoodiesApp embedded onExit={onBack} onUniversalAction={onUniversalAction} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} initialRoute={entryRoute.current} />;
}
