import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const SAGE = '#ACC8A2';
const SAGE_TINT = '#DCE8D2';
const OLIVE = '#1A2517';
const OLIVE_SOFT = '#5C6B57';
const OLIVE_FAINT = '#9AA595';
const PAPER = '#FFFFFF';
const BACKGROUND = '#F5F8F3';

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  read: boolean;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type Props = {
  onBack: () => void;
  onPayMoneyRequest: (requestId: string) => void;
};

const EXPANDABLE = new Set([
  'money_request',
  'payment_success',
  'payment_failed',
  'money_received',
  'money_sent',
  'points_earned',
  'milestone_reached',
  'referral_reward',
  'money_request_accepted',
  'money_request_declined',
  'money_request_declined_by_you',
  'refund',
  'deposit',
  'withdrawal',
]);

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const valueString = String(value).trim();
  return valueString.length ? valueString : null;
}

function moneyDetail(metadata: Record<string, unknown>) {
  const amount = asString(metadata.amount ?? metadata.money_amount);
  if (!amount) return '—';
  const parsed = Number(amount);
  const formatted = Number.isFinite(parsed) ? parsed.toFixed(2) : amount;
  const currency = asString(metadata.currency ?? metadata.money_currency) ?? 'USD';
  return `$${formatted} ${currency}`;
}

function dateFor(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function isYesterday(date: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
}

function relativeTime(date: Date) {
  const difference = Date.now() - date.getTime();
  if (difference < 0 || difference < 60_000) return 'Now';
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60 && isToday(date)) return `${Math.floor(minutes / 60)}h ago`;
  if (isYesterday(date)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function longDate(date: Date) {
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday(date)) return `Today, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

function iconFor(type: string) {
  switch (type) {
    case 'money_request': return 'account-arrow-left-outline';
    case 'money_received': return 'arrow-bottom-left';
    case 'money_sent': return 'arrow-top-right';
    case 'money_request_accepted': return 'check-circle-outline';
    case 'money_request_declined':
    case 'money_request_declined_by_you': return 'close-circle-outline';
    case 'payment_success':
    case 'payment_failed':
    case 'deposit':
    case 'withdrawal': return 'wallet-outline';
    case 'points_earned':
    case 'milestone_reached':
    case 'referral_reward': return 'star-outline';
    case 'refund': return 'backup-restore';
    default: return 'bell-outline';
  }
}

export default function WalletNotificationsScreen({ onBack, onPayMoneyRequest }: Props) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_my_wallet_notifications');
      if (rpcError) throw rpcError;

      const rows = Array.isArray(data) ? data : [];
      setNotifications(rows.map((row: any) => ({
        id: String(row.id ?? ''),
        notification_type: String(row.notification_type ?? ''),
        title: String(row.title ?? ''),
        body: String(row.body ?? ''),
        read: row.read === true,
        reference_id: row.reference_id ? String(row.reference_id) : null,
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
        created_at: String(row.created_at ?? new Date().toISOString()),
      })));
    } catch (e) {
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (notification: NotificationRow) => {
    if (notification.read) return;

    setNotifications(current =>
      current.map(item => item.id === notification.id ? { ...item, read: true } : item),
    );

    try {
      const { data, error: rpcError } = await supabase.rpc('mark_wallet_notification_read', {
        p_notification_id: notification.id,
      });
      if (rpcError || data !== true) {
        setNotifications(current =>
          current.map(item => item.id === notification.id ? { ...item, read: false } : item),
        );
      }
    } catch {
      setNotifications(current =>
        current.map(item => item.id === notification.id ? { ...item, read: false } : item),
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (markingAll || !notifications.some(item => !item.read)) return;
    setMarkingAll(true);

    try {
      const { error: rpcError } = await supabase.rpc('mark_all_wallet_notifications_read');
      if (rpcError) throw rpcError;
      setNotifications(current => current.map(item => ({ ...item, read: true })));
    } catch {
      Alert.alert('Could not update notifications', 'Please try again.');
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, notifications]);

  const decline = useCallback(async (notification: NotificationRow) => {
    const requestId = notification.reference_id;
    if (!requestId || processingRequestId) return;

    setProcessingRequestId(requestId);
    try {
      const { data, error: rpcError } = await supabase.rpc('decline_money_request', {
        p_request_id: requestId,
      });
      if (rpcError) throw rpcError;

      if (data !== true) {
        Alert.alert('Request already handled', 'This money request is no longer pending.');
        await load(true);
        return;
      }

      await load(true);
      Alert.alert('Money request declined', 'The request has been declined.');
      setExpandedId(null);
    } catch {
      Alert.alert('Unable to decline request', 'Please try again.');
    } finally {
      setProcessingRequestId(null);
    }
  }, [load, processingRequestId]);

  const grouped = useMemo(() => ({
    today: notifications.filter(n => isToday(dateFor(n.created_at))),
    yesterday: notifications.filter(n => isYesterday(dateFor(n.created_at))),
    earlier: notifications.filter(n => !isToday(dateFor(n.created_at)) && !isYesterday(dateFor(n.created_at))),
  }), [notifications]);

  const unreadExists = notifications.some(item => !item.read);

  const renderSection = (label: string, rows: NotificationRow[]) => {
    if (!rows.length) return null;
    return (
      <View>
        <Text style={styles.sectionLabel}>{label}</Text>
        {rows.map(renderNotification)}
      </View>
    );
  };

  const renderNotification = (notification: NotificationRow) => {
    const expandable = EXPANDABLE.has(notification.notification_type);
    const expanded = expandedId === notification.id && expandable;
    const pendingRequest = notification.notification_type === 'money_request';
    const visuallyUnread = !notification.read || pendingRequest;
    const processing = processingRequestId === notification.reference_id;

    return (
      <View key={notification.id} style={styles.rowOuter}>
        <Pressable
          onPress={async () => {
            await markRead(notification);
            if (expandable) {
              setExpandedId(current => current === notification.id ? null : notification.id);
            }
          }}
          style={[
            styles.row,
            visuallyUnread && styles.unreadRow,
            expanded && styles.expandedRow,
          ]}
        >
          <View style={[styles.iconCircle, visuallyUnread ? styles.unreadIcon : styles.readIcon]}>
            <MaterialCommunityIcons
              name={iconFor(notification.notification_type) as any}
              size={19}
              color={visuallyUnread ? SAGE : OLIVE}
            />
          </View>

          <View style={styles.content}>
            <View style={styles.titleLine}>
              <Text style={styles.title} numberOfLines={2}>{notification.title}</Text>
              <Text style={styles.time}>{relativeTime(dateFor(notification.created_at))}</Text>
            </View>

            <View style={styles.bodyLine}>
              <Text style={styles.body} numberOfLines={expanded ? 3 : 2}>{notification.body}</Text>
              {expandable ? (
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={OLIVE_FAINT}
                />
              ) : notification.reference_id ? (
                <MaterialCommunityIcons name="chevron-right" size={18} color={OLIVE_FAINT} />
              ) : null}
            </View>

            {expanded && (
              <View style={styles.expandedPanel}>
                {notification.notification_type === 'money_request' ? (
                  <>
                    <Detail label="From" value={asString(notification.metadata.from ?? notification.metadata.sender_name ?? notification.metadata.requester_name) ?? 'Wantiss user'} />
                    <Detail label="Amount" value={moneyDetail(notification.metadata)} />
                    <Detail label="Requested" value={asString(notification.metadata.requested_at) ?? longDate(dateFor(notification.created_at))} />
                    <View style={styles.actionRow}>
                      <Pressable
                        disabled={processing}
                        onPress={() => decline(notification)}
                        style={({ pressed }) => [styles.declineButton, pressed && styles.pressed, processing && styles.disabled]}
                      >
                        {processing ? <ActivityIndicator size="small" color={OLIVE} /> : <Text style={styles.declineText}>Decline</Text>}
                      </Pressable>
                      <Pressable
                        disabled={processing}
                        onPress={() => {
                          if (notification.reference_id) onPayMoneyRequest(notification.reference_id);
                        }}
                        style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed, processing && styles.disabled]}
                      >
                        <Text style={styles.acceptText}>Accept</Text>
                      </Pressable>
                    </View>
                    <ViewDetails />
                  </>
                ) : (
                  <>
                    {notification.metadata.points || notification.metadata.points_amount ? (
                      <Detail label="Points" value={`${asString(notification.metadata.points ?? notification.metadata.points_amount)} pts`} />
                    ) : null}
                    {notification.metadata.amount || notification.metadata.money_amount ? (
                      <Detail label="Amount" value={moneyDetail(notification.metadata)} />
                    ) : null}
                    {notification.metadata.feature_name || notification.metadata.source_feature ? (
                      <Detail label="Feature" value={asString(notification.metadata.feature_name ?? notification.metadata.source_feature) ?? '—'} />
                    ) : null}
                    <Detail label="Date" value={longDate(dateFor(notification.created_at))} />
                    {notification.reference_id ? <ViewDetails /> : null}
                  </>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={19} color={OLIVE} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        <Pressable
          onPress={markAllRead}
          disabled={!unreadExists || markingAll}
          style={({ pressed }) => [
            styles.markAllButton,
            (!unreadExists || markingAll) && styles.markAllDisabled,
            pressed && styles.pressed,
          ]}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={OLIVE} />
          ) : (
            <Text style={styles.markAllText}>Mark all as read</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={OLIVE} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="bell-off-outline" size={34} color={OLIVE_FAINT} />
          <Text style={styles.errorTitle}>Unable to load notifications</Text>
          <Pressable onPress={() => load()} style={styles.tryAgain}>
            <Text style={styles.tryAgainText}>Try again</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScroll}>
          <EmptyState />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={OLIVE} />}
          contentContainerStyle={styles.list}
        >
          {renderSection('Today', grouped.today)}
          {renderSection('Yesterday', grouped.yesterday)}
          {renderSection('Earlier', grouped.earlier)}
          <EmptyState />
        </ScrollView>
      )}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ViewDetails() {
  return (
    <Pressable style={styles.viewDetails}>
      <Text style={styles.viewDetailsText}>View full details</Text>
      <Text style={styles.viewDetailsArrow}>›</Text>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="bell-outline" size={34} color={OLIVE} />
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptyBody}>No new notifications at the moment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    height: 100,
    paddingHorizontal: 22,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: SAGE_TINT, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    marginLeft: 12, color: OLIVE, fontFamily: 'Manrope_800ExtraBold',
    fontSize: 19, lineHeight: 19,
  },
  markAllButton: {
    minHeight: 34, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(26,37,23,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  markAllDisabled: { opacity: 0.45 },
  markAllText: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  list: { paddingTop: 0, paddingBottom: 24 },
  sectionLabel: {
    marginTop: 16, marginBottom: 8, marginHorizontal: 22,
    color: OLIVE_FAINT, fontFamily: 'Inter_600SemiBold', fontSize: 13,
  },
  rowOuter: { marginHorizontal: 12, marginBottom: 6 },
  row: {
    minHeight: 72, paddingHorizontal: 10, paddingVertical: 14,
    borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start',
  },
  unreadRow: { backgroundColor: 'rgba(220,232,210,0.55)' },
  expandedRow: { backgroundColor: SAGE_TINT },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadIcon: { backgroundColor: OLIVE },
  readIcon: { backgroundColor: SAGE_TINT },
  content: { flex: 1, marginLeft: 13 },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start' },
  title: {
    flex: 1, color: OLIVE, fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14, lineHeight: 15,
  },
  time: {
    marginLeft: 8, color: OLIVE_FAINT, fontFamily: 'Inter_400Regular',
    fontSize: 11, lineHeight: 12,
  },
  bodyLine: { marginTop: 3, flexDirection: 'row', alignItems: 'center' },
  body: {
    flex: 1, color: OLIVE_SOFT, fontFamily: 'Inter_400Regular',
    fontSize: 12.5, lineHeight: 17.5,
  },
  expandedPanel: { marginTop: 14, paddingTop: 14, marginLeft: 55 },
  detailLine: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingBottom: 7, gap: 12,
  },
  detailLabel: { flex: 1, color: OLIVE_SOFT, fontFamily: 'Inter_400Regular', fontSize: 12 },
  detailValue: { flex: 1, textAlign: 'right', color: OLIVE, fontFamily: 'Inter_700Bold', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 3 },
  declineButton: {
    flex: 1, paddingVertical: 11, borderRadius: 14,
    backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center',
  },
  acceptButton: {
    flex: 1, paddingVertical: 11, borderRadius: 14,
    backgroundColor: OLIVE, alignItems: 'center', justifyContent: 'center',
  },
  declineText: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },
  acceptText: { color: SAGE, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.82 },
  viewDetails: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  viewDetailsText: { color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  viewDetailsArrow: { marginLeft: 4, color: OLIVE, fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  errorTitle: { marginTop: 10, color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  tryAgain: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: OLIVE },
  tryAgainText: { color: SAGE, fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  emptyScroll: { flexGrow: 1, paddingTop: 16, paddingBottom: 24 },
  emptyCard: {
    marginHorizontal: 22, marginTop: 18, paddingHorizontal: 20,
    paddingTop: 26, paddingBottom: 22, borderRadius: 20,
    backgroundColor: SAGE_TINT, alignItems: 'center',
  },
  emptyTitle: { marginTop: 10, color: OLIVE, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 },
  emptyBody: { marginTop: 4, color: OLIVE_SOFT, fontFamily: 'Inter_400Regular', fontSize: 12 },
});
