import React from 'react';
import {useUnreadSummary} from '../../shared/inbox/useUnreadSummary';
import View,{type MenuProps} from './KonsolissQuickMenuView';
export type {KonsolissMenuAction} from './KonsolissQuickMenuView';
export default function KonsolissQuickMenu(props:MenuProps){return <View {...props} inbox={useUnreadSummary()}/>;}
