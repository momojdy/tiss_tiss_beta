import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}

export const Stars = ({ value, size = 16, onChange }: Props) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => {
      const icon = <Ionicons name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half' : 'star-outline'} size={size} color="#F5A623" />;
      return onChange ? (
        <Pressable key={i} accessibilityLabel={`${i} stars`} onPress={() => onChange(i)} hitSlop={6}>
          {icon}
        </Pressable>
      ) : (
        <View key={i}>{icon}</View>
      );
    })}
  </View>
);
