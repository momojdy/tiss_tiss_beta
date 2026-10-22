import React from 'react';
import { View } from 'react-native';
import { useGutter } from '../../styles/Glowz/LayoutContext';
import { GlowzIconButton } from './GlowzIconButton';
import { GlowzText } from './GlowzText';

interface Props {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Left slot replaces the title (logo). */
  children?: React.ReactNode;
  backLabel?: string;
}

/** Header row used by every secondary screen: back arrow, title, optional right action. */
export function GlowzTopBar({ title, onBack, right, children, backLabel = 'Back' }: Props) {
  const g = useGutter();
  return (
    <View style={{ paddingLeft: g.left, paddingRight: g.right }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {onBack ? <GlowzIconButton icon="back" label={backLabel} onPress={onBack} /> : null}
        {children ?? (
          <View style={{ flex: 1 }}>
            <GlowzText kind="display" size={26} numberOfLines={1}>{title}</GlowzText>
          </View>
        )}
        {right}
      </View>
    </View>
  );
}
