import {createContext} from 'react';
import type {ScrollView,ScrollViewProps} from 'react-native';
import type {SharedValue} from 'react-native-reanimated';
export type ScrollPosition={x:number;y:number;target:ScrollView|null;nativeOffset?:SharedValue<number>};
export type ScrollRegistry=Map<string,ScrollPosition>;
export const SpillSceneContext=createContext<{presentation:boolean;scrolls:ScrollRegistry}|null>(null);
export type SyncedScrollProps=ScrollViewProps&{spillScrollId?:string};
