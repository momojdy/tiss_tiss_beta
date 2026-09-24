import { Easing } from 'react-native-reanimated';

export const easeOut = (t:number) => { 'worklet'; return Easing.out(Easing.cubic)(t); };
export const easeInCubic = (t:number) => { 'worklet'; return Easing.in(Easing.cubic)(t); };
export const easeInOutCubic = (t:number) => { 'worklet'; return Easing.inOut(Easing.cubic)(t); };
export const easeOutCubic = (t:number) => { 'worklet'; return Easing.out(Easing.cubic)(t); };
export const lerp = (a:number,b:number,t:number) => { 'worklet'; return a+(b-a)*t; };
export const clamp01 = (v:number) => { 'worklet'; return Math.min(1,Math.max(0,v)); };