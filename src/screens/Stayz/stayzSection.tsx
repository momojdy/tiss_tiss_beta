import React from 'react';
import { View } from 'react-native';
import { StayzTxt } from './stayzTxt';

export const StayzSection = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <StayzTxt v="h2">{title}</StayzTxt>
      {action}
    </View>
    {children}
  </View>
);
