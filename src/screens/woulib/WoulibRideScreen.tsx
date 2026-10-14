import React from 'react';
import type {WoulibScreenProps} from './WoulibFlow';
import {WoulibSearchingScreen} from './WoulibSearchingScreen';
import {WoulibOfferDriverScreen} from './WoulibOfferDriverScreen';
import {WoulibConfirmedScreen} from './WoulibConfirmedScreen';
import {WoulibOnWayScreen} from './WoulibOnWayScreen';
import {WoulibArrivedScreen} from './WoulibArrivedScreen';
import {WoulibRidingScreen} from './WoulibRidingScreen';
import {WoulibCompleteScreen} from './WoulibCompleteScreen';

export function WoulibRideScreen(props: WoulibScreenProps & {stars: number; setStars: React.Dispatch<React.SetStateAction<number>>}): React.ReactElement | null {
  const st = props.ride.status;
  if (st === 'searching') return WoulibSearchingScreen(props);
  if (st === 'offer' || st === 'declined') return WoulibOfferDriverScreen(props);
  if (st === 'confirmed') return WoulibConfirmedScreen(props);
  if (st === 'onway') return WoulibOnWayScreen(props);
  if (st === 'arrived') return WoulibArrivedScreen(props);
  if (st === 'riding') return WoulibRidingScreen(props);
  if (st === 'complete') return WoulibCompleteScreen(props);
  return null;
}

export default WoulibRideScreen;
