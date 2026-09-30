import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPressViewAll?: () => void;
  onPressToPay?: () => void;
  onPressToShip?: () => void;
  onPressToReceive?: () => void;
  onPressToReview?: () => void;
  onPressRefund?: () => void;
};

const ICON = '#25232A';

function ExpressBoxIcon({ size = 22 }: { size?: number }) {
  const s = size;
  const stroke = 1.35;

  return (
    <View style={{ width: s, height: s, position: 'relative' }}>
      <View
        style={[
          styles.boxFront,
          {
            width: s * 0.58,
            height: s * 0.48,
            left: s * 0.22,
            top: s * 0.38,
            borderWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.boxTop,
          {
            width: s * 0.42,
            height: s * 0.42,
            left: s * 0.27,
            top: s * 0.17,
            borderTopWidth: stroke,
            borderLeftWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.boxSide,
          {
            width: s * 0.18,
            height: s * 0.48,
            left: s * 0.80,
            top: s * 0.38,
            borderTopWidth: stroke,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.boxSeam,
          {
            height: s * 0.36,
            left: s * 0.51,
            top: s * 0.48,
            borderLeftWidth: stroke,
          },
        ]}
      />
    </View>
  );
}

function DeliveryTruckIcon({ size = 22 }: { size?: number }) {
  const s = size;
  const stroke = 1.35;

  return (
    <View style={{ width: s, height: s, position: 'relative' }}>
      <View
        style={[
          styles.truckCargo,
          {
            width: s * 0.53,
            height: s * 0.43,
            left: s * 0.08,
            top: s * 0.29,
            borderWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.truckCab,
          {
            width: s * 0.30,
            height: s * 0.33,
            left: s * 0.61,
            top: s * 0.39,
            borderWidth: stroke,
            borderLeftWidth: 0,
          },
        ]}
      />
      <View
        style={[
          styles.truckWindow,
          {
            width: s * 0.18,
            height: s * 0.13,
            left: s * 0.66,
            top: s * 0.44,
            borderWidth: stroke,
          },
        ]}
      />
      <View
        style={[
          styles.truckBase,
          {
            width: s * 0.83,
            left: s * 0.08,
            top: s * 0.72,
            borderTopWidth: stroke,
          },
        ]}
      />
      <View style={[styles.wheel, { left: s * 0.20, top: s * 0.68, width: s * 0.18, height: s * 0.18, borderWidth: stroke }]} />
      <View style={[styles.wheel, { left: s * 0.65, top: s * 0.68, width: s * 0.18, height: s * 0.18, borderWidth: stroke }]} />
    </View>
  );
}

export default function MeOrdersCard({
  onPressViewAll,
  onPressToPay,
  onPressToShip,
  onPressToReceive,
  onPressToReview,
  onPressRefund,
}: Props) {
  const items = [
    { type: 'ion', icon: 'wallet-outline' as const, label: 'To Pay', onPress: onPressToPay },
    { type: 'box', label: 'To Ship', onPress: onPressToShip },
    { type: 'truck', label: 'To Receive', onPress: onPressToReceive },
    { type: 'ion', icon: 'chatbubble-ellipses-outline' as const, label: 'To Review', onPress: onPressToReview },
    { type: 'ion', icon: 'refresh-circle-outline' as const, label: 'Refund / Support', onPress: onPressRefund },
  ] as const;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Pressable style={styles.viewAll} onPress={onPressViewAll} hitSlop={6}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={11} color="#8A8A8A" />
        </Pressable>
      </View>

      <View style={styles.itemsRow}>
        {items.map((item) => (
          <Pressable key={item.label} style={styles.item} onPress={item.onPress} hitSlop={5}>
            {item.type === 'box' ? (
              <ExpressBoxIcon size={22} />
            ) : item.type === 'truck' ? (
              <DeliveryTruckIcon size={22} />
            ) : (
              <Ionicons name={item.icon} size={22} color={ICON} />
            )}

            <Text style={styles.itemLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 13,
    height: 91,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingTop: 10,
    shadowColor: '#E91E8C',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 11,
    lineHeight: 13,
    color: '#8A8A8A',
    marginRight: 2,
  },
  itemsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 12,
    color: '#1C1C1C',
    fontWeight: '500',
    textAlign: 'center',
  },
  boxFront: {
    position: 'absolute',
    borderColor: ICON,
    borderRadius: 1,
  },
  boxTop: {
    position: 'absolute',
    borderColor: ICON,
    transform: [{ rotate: '45deg' }],
  },
  boxSide: {
    position: 'absolute',
    borderColor: ICON,
    borderLeftWidth: 0,
  },
  boxSeam: {
    position: 'absolute',
    borderColor: ICON,
  },
  truckCargo: {
    position: 'absolute',
    borderColor: ICON,
    borderRadius: 1,
  },
  truckCab: {
    position: 'absolute',
    borderColor: ICON,
    borderRadius: 1,
  },
  truckWindow: {
    position: 'absolute',
    borderColor: ICON,
    borderRadius: 1,
  },
  truckBase: {
    position: 'absolute',
    borderColor: ICON,
  },
  wheel: {
    position: 'absolute',
    borderColor: ICON,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
});
