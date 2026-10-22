import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { fmtCountdown } from '../../../util/Glowz/format';
import { GlowzText } from '../GlowzText';

/** Sample five minute slot hold. Nothing is reserved; expiry sends the customer back to pick a time. */
export function GlowzHoldTimer({ until, paused, onExpire }: { until: number; paused: boolean; onExpire: () => void }) {
  const [secs, setSecs] = useState(Math.max(0, Math.round((until - Date.now()) / 1000)));
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((until - Date.now()) / 1000));
      setSecs(s);
      if (s === 0) onExpire();
    }, 1000);
    return () => clearInterval(t);
  }, [until, paused, onExpire]);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <GlowzText kind="small" muted>Sample slot hold (nothing is reserved)</GlowzText>
      <GlowzText kind="small" weight={600} price accessibilityLabel={`Hold time left ${fmtCountdown(secs)}`}>{fmtCountdown(secs)}</GlowzText>
    </View>
  );
}
