import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export const useStayzOnline = () => {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return unsub;
  }, []);
  return online;
};
