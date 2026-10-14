import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export const StayzScreen = ({ title, back = true, right, scroll = true, footer, children, contentStyle, noTop, accentStripe = true }: Props) => {
  const { colors } = useStayzTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const online = useStayzOnline();
  const showHeader = !!title || back || !!right;
  return (
    <View style={[styles.fill, { backgroundColor: colors.bg, paddingTop: noTop ? 0 : insets.top }]}>
      {accentStripe ? <View style={[styles.accentStripe, { backgroundColor: colors.brandSoft }]} /> : null}
      {showHeader ? (
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          {back && nav.canGoBack() ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => nav.goBack()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.line }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
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
      {footer ? <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.line, paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  accentStripe: { height: 5, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  back: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  title: { flex: 1 },
  rightSlot: { minWidth: 40, alignItems: 'flex-end' },
  content: { padding: 18, paddingBottom: 34, gap: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
