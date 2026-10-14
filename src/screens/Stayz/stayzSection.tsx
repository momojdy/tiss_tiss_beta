import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StayzTxt } from './stayzTxt';

export const StayzSection = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <View style={styles.section}>
    <View style={styles.heading}>
      <StayzTxt v="h2">{title}</StayzTxt>
      {action}
    </View>
    {children}
  </View>
);
