import {useEffect,useRef,useState} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Feature-local override; an in-flight storage read cannot overwrite a user toggle. */
export function useFeatureTheme(storageKey:string){
 const systemDark=useColorScheme()==='dark';
 const [override,setOverride]=useState<'dark'|'light'|null>(null);
 const [error,setError]=useState<string|null>(null);
 const revision=useRef(0);
 const dark=override===null?systemDark:override==='dark';
 useEffect(()=>{
  const request=++revision.current;
  let active=true;
  void AsyncStorage.getItem(storageKey).then(value=>{
   if(active&&request===revision.current&&(value==='dark'||value==='light'))setOverride(value);
  }).catch(()=>{if(active&&request===revision.current)setError('Theme preference could not be loaded.');});
  return()=>{active=false;};
 },[storageKey]);
 const toggle=()=>{
  const request=++revision.current;
  const next=dark?'light':'dark';
  setOverride(next);setError(null);
  void AsyncStorage.setItem(storageKey,next).catch(()=>{
   if(request===revision.current)setError('Theme preference could not be saved.');
  });
 };
 return {dark,toggle,error};
}
