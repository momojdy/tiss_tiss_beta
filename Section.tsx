import React from 'react';
import { View } from 'react-native';
import { Txt } from './Txt';

export const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Txt v="h2">{title}</Txt>
      {action}
    </View>
    {children}
  </View>
);
