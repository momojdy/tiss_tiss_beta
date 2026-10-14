import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStayzTheme } from './stayzThemeContext';
import { useStayzOnline } from './stayzUseOnline';
import { StayzTxt } from './stayzTxt';

interface Props {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  noTop?: boolean;
  accentStripe?: boolean;
}

export const StayzScreen = ({ title, back = true, right, scroll = true, footer, children, contentStyle, accentStripe = true }: Props) => {
  const { colors } = useStayzTheme();
  const nav = useNavigation();
  const online = useStayzOnline();
  const showHeader = !!title || back || !!right;
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }]}>
      {showHeader ? (
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { if (nav.canGoBack()) nav.goBack(); else nav.getParent()?.navigate('Tabs' as never, { screen: 'Home' } as never); }} style={[styles.back, { backgroundColor: '#FFFFFF', borderColor: colors.line }]}>
              <Ionicons name="arrow-back" size={23} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <StayzTxt v="h2" style={styles.title} numberOfLines={1}>
            {title}
          </StayzTxt>
          <View style={styles.rightSlot}>{right}</View>
        </View>
      ) : null}
      {accentStripe ? <View style={styles.accentStripe} /> : null}
      {!online ? (
        <View style={[styles.offline, { backgroundColor: colors.warnSoft }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warn} />
          <StayzTxt v="small" color={colors.warn} bold>
            You are offline. Showing the last saved information.
          </StayzTxt>
        </View>
      ) : null}
      {scroll ? (
        <ScrollView style={styles.fill} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.line, paddingBottom: 12 }]}>{footer}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  accentStripe: { height: 20, width: '100%', flexShrink: 0, backgroundColor: '#F39A91' },
  header: { width: '100%', height: 100, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingBottom: 4, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  title: { flex: 1, transform: [{ translateY: -4.5 }] },
  rightSlot: { minWidth: 40, alignItems: 'flex-end' },
  content: { padding: 18, paddingBottom: 120, gap: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
