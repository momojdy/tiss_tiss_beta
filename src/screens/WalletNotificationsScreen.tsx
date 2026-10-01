import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================
// COLORS — matched to Wantiss Wallet HTML
// ============================================================
const C = {
  sage: '#ACC8A2',
  sageTint: '#DCE8D2',
  sageWash: 'rgba(220,232,210,0.55)',
  olive: '#1A2517',
  oliveBorder: 'rgba(26,37,23,0.35)',
  oliveSoft: '#5C6B57',
  oliveFaint: '#9AA595',
  paper: '#FFFFFF',
  background: '#F5F8F3',
};

// ============================================================
// TYPES
// ============================================================
type NotificationItem = {
  id: string;
  notificationType: string;
  title: string;
  body: string;
  read: boolean;
  referenceId: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type WalletNotificationsProps = {
  onBack: () => void;
  /** Navigate to Pay Money Request with the request id. */
  onAcceptRequest: (requestId: string) => void;
  /** Navigate to the order tracking page. Omit to hide order chevrons. */
  onOpenOrder?: (orderId: string) => void;
  /** Navigate to a money request detail page. Omit to hide the link. */
  onOpenRequestDetails?: (requestId: string) => void;
  /** Bump this number (e.g. on screen focus) to silently refresh. */
  refreshSignal?: number;
  showMessage?: (message: string) => void;
};

const EXPANDABLE = new Set([
  'money_request',
  'money_request_accepted',
  'money_request_accepted_by_you',
  'money_request_declined',
  'money_request_declined_by_you',
  'payment_success',
  'payment_failed',
  'money_received',
  'money_sent',
  'points_earned',
  'milestone_reached',
  'referral_reward',
  'refund',
  'deposit',
  'withdrawal',
]);

const isOrderType = (t: string) => t.startsWith('order_');
const isActionable = (n: NotificationItem) => n.notificationType === 'money_request';
const isTransactionType = (t: string) =>
  t === 'payment_success' ||
  t === 'payment_failed' ||
  t === 'money_received' ||
  t === 'money_sent' ||
  t === 'refund' ||
  t === 'deposit' ||
  t === 'withdrawal' ||
  t.startsWith('payment_');
const isExpandable = (n: NotificationItem) => EXPANDABLE.has(n.notificationType) || isTransactionType(n.notificationType);
const hasTransactionDetails = (n: NotificationItem) => isTransactionType(n.notificationType);

function parseRow(row: any): NotificationItem {
  const d = row?.created_at ? new Date(row.created_at) : new Date();
  return {
    id: String(row?.id ?? ''),
    notificationType: String(row?.notification_type ?? ''),
    title: String(row?.title ?? ''),
    body: String(row?.body ?? ''),
    read: row?.read === true,
    referenceId: row?.reference_id != null ? String(row.reference_id) : null,
    metadata: row?.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: isNaN(d.getTime()) ? new Date() : d,
  };
}

// ============================================================
// DATE HELPERS
// ============================================================
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (d: Date) => sameDay(d, new Date());
const isYesterday = (d: Date) => {
  const n = new Date();
  return sameDay(d, new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1));
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;

function formatTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24 && isToday(d)) return `${hrs}h ago`;
  if (isYesterday(d)) return 'Yesterday';
  return shortDate(d);
}

function formatDateTime(d: Date): string {
  const h = d.getHours();
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const min = String(d.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  return isToday(d) ? `Today, ${hour}:${min} ${suffix}` : `${shortDate(d)}, ${hour}:${min} ${suffix}`;
}

function metaString(meta: Record<string, any>, keys: string[]): string | null {
  for (const k of keys) {
    const v = meta[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function formatMoney(amount: string | null, currency: string | null): string {
  if (amount == null) return '—';
  const n = parseFloat(amount);
  const formatted = isNaN(n) ? amount : n.toFixed(2);
  return `$${formatted} ${currency || 'USD'}`;
}

function iconFor(type: string) {
  switch (type) {
    case 'money_request':
      return 'account-arrow-left-outline';
    case 'money_received':
    case 'deposit':
      return 'arrow-bottom-left';
    case 'money_sent':
    case 'withdrawal':
      return 'arrow-top-right';
    case 'money_request_accepted':
    case 'money_request_accepted_by_you':
      return 'check-circle-outline';
    case 'money_request_declined':
    case 'money_request_declined_by_you':
      return 'close-circle-outline';
    case 'payment_success':
    case 'payment_failed':
      return 'wallet-outline';
    case 'points_earned':
    case 'milestone_reached':
    case 'referral_reward':
      return 'star-outline';
    case 'refund':
      return 'backup-restore';
    default:
      return isOrderType(type) ? 'cube-outline' : 'bell-outline';
  }
}

// ============================================================
// COMPONENT
// ============================================================
export default function WalletNotificationsScreen({
  onBack,
  onAcceptRequest,
  onOpenOrder,
  onOpenRequestDetails,
  refreshSignal,
  showMessage,
}: WalletNotificationsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  const toast = useCallback(
    (m: string) => (showMessage ? showMessage(m) : Alert.alert('', m)),
    [showMessage],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { data, error: err } = await supabase.rpc('get_my_wallet_notifications');
      if (err) throw err;
      const next = (Array.isArray(data) ? data : []).map(parseRow);
      if (!mounted.current) return;
      setItems(next);
      setLoading(false);
      setError(null);
      setExpandedId((cur) =>
        cur && next.some((n) => n.id === cur && isExpandable(n)) ? cur : null,
      );
    } catch {
      if (!mounted.current) return;
      if (silent) return;
      setLoading(false);
      setError('Unable to load notifications.');
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (refreshSignal !== undefined) load(true);
  }, [refreshSignal, load]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    await load(true);
    if (mounted.current) setRefreshing(false);
  };

  const markAsRead = useCallback(async (n: NotificationItem) => {
    if (n.read || isActionable(n)) return;

    setItems((cur) => cur.map((i) => (i.id === n.id ? { ...i, read: true } : i)));

    let ok = false;
    try {
      const { data, error: err } = await supabase.rpc('mark_wallet_notification_read', {
        p_notification_id: n.id,
      });
      ok = !err && data === true;
    } catch {
      ok = false;
    }

    if (!ok && mounted.current) {
      setItems((cur) => cur.map((i) => (i.id === n.id ? { ...i, read: false } : i)));
    }
  }, []);

  const hasMarkableUnread = items.some((n) => !n.read && !isActionable(n));

  const markAll = async () => {
    if (markingAll || !hasMarkableUnread) return;
    setMarkingAll(true);
    try {
      const { error: err } = await supabase.rpc('mark_all_wallet_notifications_read');
      if (err) throw err;
      if (!mounted.current) return;
      setItems((cur) => cur.map((n) => (isActionable(n) ? n : { ...n, read: true })));
    } catch {
      // Don't claim success if the RPC failed.
    } finally {
      if (mounted.current) setMarkingAll(false);
    }
  };

  const hasDestination = (n: NotificationItem) =>
    !!n.referenceId && isOrderType(n.notificationType) && !!onOpenOrder;

  const hasFullDetails = (n: NotificationItem) => {
    if (n.notificationType === 'money_request') return !!n.referenceId && !!onOpenRequestDetails;
    if (hasTransactionDetails(n)) return true;
    return !!n.referenceId && hasDestination(n);
  };

  const openDestination = (n: NotificationItem) => {
    if (!n.referenceId) return;
    if (n.notificationType === 'money_request') onOpenRequestDetails?.(n.referenceId);
    else if (isOrderType(n.notificationType)) onOpenOrder?.(n.referenceId);
  };

  const onTap = (n: NotificationItem) => {
    markAsRead(n);
    if (isExpandable(n)) {
      LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeOut', 'opacity'));
      setExpandedId((cur) => (cur === n.id ? null : n.id));
      return;
    }
    openDestination(n);
  };

  const accept = (n: NotificationItem) => {
    if (!n.referenceId) {
      toast('This money request is missing its request ID.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    onAcceptRequest(n.referenceId);
    setTimeout(() => {
      busyRef.current = false;
    }, 800);
  };

  const decline = async (n: NotificationItem) => {
    const requestId = n.referenceId;
    if (!requestId) {
      toast('This money request is missing its request ID.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessingId(requestId);

    try {
      const { data, error: err } = await supabase.rpc('decline_money_request', {
        p_request_id: requestId,
      });
      if (err) throw err;
      if (!mounted.current) return;
      if (data !== true) {
        toast('This money request is no longer pending.');
      } else {
        toast('Money request declined.');
      }
      await load(true);
    } catch {
      toast('Unable to decline this money request.');
    } finally {
      busyRef.current = false;
      if (mounted.current) setProcessingId(null);
    }
  };

  const groups = useMemo(
    () => ({
      today: items.filter((i) => isToday(i.createdAt)),
      yesterday: items.filter((i) => isYesterday(i.createdAt)),
      earlier: items.filter((i) => !isToday(i.createdAt) && !isYesterday(i.createdAt)),
    }),
    [items],
  );

  const renderDetails = (n: NotificationItem) => {
    const m = n.metadata;
    const from = metaString(m, ['from', 'sender_name', 'requester_name']);
    const amount = metaString(m, ['amount', 'money_amount']);
    const currency = metaString(m, ['currency', 'money_currency']);
    const points = metaString(m, ['points', 'points_amount']);
    const requested = metaString(m, ['requested_at']);
    const feature = metaString(m, ['feature_name', 'source_feature']);

    const lines: [string, string][] = [];
    if (n.notificationType === 'money_request') {
      lines.push(['From', from ?? 'Wantiss user']);
      lines.push(['Amount', formatMoney(amount, currency)]);
      lines.push(['Requested', requested ?? formatDateTime(n.createdAt)]);
    } else {
      if (points != null) lines.push(['Points', `${points} pts`]);
      if (amount != null) lines.push(['Amount', formatMoney(amount, currency)]);
      if (feature != null) lines.push(['Feature', feature]);
      if (lines.length === 0) lines.push(['Date', formatDateTime(n.createdAt)]);
    }

    return lines.map(([label, value]) => (
      <View key={label} style={s.detailLine}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue} numberOfLines={1}>{value}</Text>
      </View>
    ));
  };

  const renderViewDetails = (n: NotificationItem) => (
    <Pressable onPress={() => openDestination(n)} style={s.viewDetails}>

      <Text style={s.viewDetailsText}>View full details</Text>
      <Text style={s.viewDetailsChevron}>›</Text>
    </Pressable>
  );

  const renderActions = (n: NotificationItem) => {
    const isProcessing = processingId === n.referenceId;
    const disabled = processingId !== null;
    return (
      <View>
        <View style={s.actionsRow}>
          <Pressable
            disabled={disabled}
            onPress={() => decline(n)}
            style={[s.actionBtn, { backgroundColor: C.paper }]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={C.olive} />
            ) : (
              <Text style={[s.actionText, { color: C.olive }]}>Decline</Text>
            )}
          </Pressable>
          <View style={{ width: 10 }} />
          <Pressable
            disabled={disabled}
            onPress={() => accept(n)}
            style={[s.actionBtn, { backgroundColor: C.olive }]}
          >
            <Text style={[s.actionText, { color: C.sage }]}>Accept</Text>
          </Pressable>
        </View>
        {hasFullDetails(n) && renderViewDetails(n)}
      </View>
    );
  };

  const renderRow = (n: NotificationItem) => {
    const expandable = isExpandable(n);
    const expanded = expandedId === n.id && expandable;
    const unread = !n.read;

    return (
      <View key={n.id} style={s.rowOuter}>
        <Pressable
          onPress={() => onTap(n)}
          style={[
            s.row,
            { backgroundColor: expanded ? C.sageTint : n.read ? 'transparent' : C.sageWash },
          ]}
        >
          <View style={s.rowTop}>
            <View style={[s.iconCircle, { backgroundColor: unread ? C.olive : C.sageTint }]}>
              <MaterialCommunityIcons
                name={iconFor(n.notificationType) as any}
                size={19}
                color={unread ? C.sage : C.olive}
              />
            </View>

            <View style={s.content}>
              <View style={s.titleRow}>
                <Text style={s.title} numberOfLines={2}>{n.title}</Text>
                <Text style={s.time}>{formatTime(n.createdAt)}</Text>
              </View>
              <View style={s.bodyRow}>
                <Text style={s.body} numberOfLines={expanded ? 3 : 2}>{n.body}</Text>
                {expandable ? (
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={C.oliveFaint}
                    style={s.indicator}
                  />
                ) : hasDestination(n) ? (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={C.oliveFaint}
                    style={s.indicator}
                  />
                ) : null}
              </View>
            </View>
          </View>

        </Pressable>

        {expanded && (
          <View style={s.panel}>
            {renderDetails(n)}
            {isActionable(n)
              ? renderActions(n)
              : renderViewDetails(n)}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (label: string, list: NotificationItem[]) =>
    list.length === 0 ? null : (
      <View key={label}>
        <Text style={s.sectionLabel}>{label}</Text>
        {list.map(renderRow)}
      </View>
    );

  const footer = (
    <View style={s.footer}>
      <MaterialCommunityIcons name="bell-outline" size={34} color={C.olive} />
      <Text style={s.footerTitle}>You're all caught up!</Text>
      <Text style={s.footerBody}>No new notifications at the moment.</Text>
    </View>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={s.center}>
        <ActivityIndicator size="small" color={C.olive} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={s.center}>
        <MaterialCommunityIcons name="bell-off-outline" size={34} color={C.oliveFaint} />
        <Text style={s.errorTitle}>Unable to load notifications</Text>
        <Pressable onPress={() => load(false)} style={s.retry}>
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={C.olive}
          />
        }
      >
        {items.length > 0 && (
          <>
            {renderSection('Today', groups.today)}
            {renderSection('Yesterday', groups.yesterday)}
            {renderSection('Earlier', groups.earlier)}
          </>
        )}
        {footer}
      </ScrollView>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={C.olive} />
          </Pressable>
          <Text style={s.headerTitle}>Notifications</Text>
        </View>
        <Pressable
          onPress={markAll}
          disabled={!hasMarkableUnread}
          style={[s.markAll, { opacity: hasMarkableUnread ? 1 : 0.45 }]}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={C.olive} />
          ) : (
            <Text style={s.markAllText}>Mark all as read</Text>
          )}
        </Pressable>
      </View>
      {body}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },

  header: {
    width: '100%',
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    marginLeft: 12,
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 19,
    lineHeight: 19,
    color: C.olive,
    transform: [{ translateY: 1 }],
  },
  markAll: {
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.oliveBorder,
    borderRadius: 20,
  },
  markAllText: { fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: C.olive },

  sectionLabel: {
    fontFamily: 'Manrope',
    fontWeight: '700',
    fontSize: 13,
    color: C.oliveFaint,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },

  rowOuter: { paddingHorizontal: 12, marginBottom: 6 },
  row: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { flex: 1, fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: C.olive, lineHeight: 15 },
  time: { fontFamily: 'Inter', fontWeight: '400', fontSize: 11, color: C.oliveFaint, marginLeft: 8, marginRight: 15 },
  bodyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  body: { flex: 1, fontFamily: 'Inter', fontWeight: '400', fontSize: 12.5, color: C.oliveSoft, lineHeight: 17.5 },
  indicator: { marginLeft: 4 },

  panel: { marginTop: 14, marginLeft: 55, paddingTop: 14 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  detailLabel: { flexShrink: 1, fontFamily: 'Inter', fontWeight: '400', fontSize: 12, color: C.oliveSoft },
  detailValue: {
    flexShrink: 1,
    marginLeft: 12,
    marginRight: 15,
    textAlign: 'right',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: C.olive,
  },

  actionsRow: { flexDirection: 'row', marginTop: 3 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: 'Manrope', fontWeight: '700', fontSize: 13 },

  viewDetails: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 12 },
  viewDetailsText: { fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: C.olive },
  viewDetailsChevron: { fontFamily: 'Inter', fontWeight: '600', fontSize: 17, color: C.olive, marginLeft: 4 },

  footer: {
    marginHorizontal: 22,
    marginTop: 18,
    marginBottom: 24,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: C.sageTint,
    borderRadius: 20,
    alignItems: 'center',
  },
  footerTitle: { fontFamily: 'Manrope', fontWeight: '800', fontSize: 14, color: C.olive, marginTop: 10 },
  footerBody: { fontFamily: 'Inter', fontWeight: '400', fontSize: 12, color: C.oliveSoft, marginTop: 4, textAlign: 'center' },

  errorTitle: { fontFamily: 'Manrope', fontWeight: '800', fontSize: 14, color: C.olive, marginTop: 10, textAlign: 'center' },
  retry: { marginTop: 12, backgroundColor: C.olive, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: C.sage },
});