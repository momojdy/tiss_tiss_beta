import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStayzTheme } from './stayzThemeContext';
import { PaymentMethod } from './stayzTypes';
import { StayzTxt } from './stayzTxt';

const brandColor: Record<string, string> = { Visa: '#1A1F71', Mastercard: '#EB001B', Discover: '#F76F20', JCB: '#0B4EA2', UnionPay: '#D10429' };

export const StayzPaymentIcon = ({ method }: { method: PaymentMethod }) => {
  const { colors } = useStayzTheme();
  if (method.kind === 'wallet')
    return (
      <View style={[styles.box, { backgroundColor: colors.tealSoft }]}>
        <Ionicons name="wallet-outline" size={20} color={colors.teal} />
      </View>
    );
  if (method.kind === 'card')
    return (
      <View style={[styles.box, { backgroundColor: brandColor[method.brand ?? 'Visa'] }]}>
        <StayzTxt v="caption" color="#FFFFFF">
          {(method.brand ?? 'Card').slice(0, 4).toUpperCase()}
        </StayzTxt>
      </View>
    );
  return (
    <View style={[styles.box, { backgroundColor: method.kind === 'moncash' ? '#E2231A' : '#0B6EF3' }]}>
      <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { width: 44, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
