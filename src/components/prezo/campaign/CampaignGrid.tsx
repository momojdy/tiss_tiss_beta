import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { usePrezoCampaignActions } from '../../../features/prezo/PrezoCampaignActions';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { getCampaignVariant } from '../../../lib/prezo/campaignRules';
import { prezoLayout, prezoRadii } from '../../../theme/prezoTheme';
import type { Campaign } from '../../../types/prezo';
import { CampaignCard } from './CampaignCard';

const estimatedAspect = { s: 1, p: 3 / 4, l: 4 / 3, f: 16 / 9 } as const;
const estimatedBodyHeight = 96;

interface GridMetrics {
  gap: number;
  minColumn: number;
}

const getMetrics = (windowWidth: number): GridMetrics => {
  if (windowWidth >= 1000) return { gap: 16, minColumn: 240 };
  if (windowWidth >= 600) return { gap: 14, minColumn: 190 };
  return { gap: 12, minColumn: 160 };
};

type Segment =
  | { kind: 'featured'; campaign: Campaign; companions: Campaign[] }
  | { kind: 'columns'; campaigns: Campaign[] };

const buildSegments = (
  campaigns: Campaign[],
  columns: number,
  columnWidth: number,
): Segment[] => {
  const segments: Segment[] = [];
  const spare = columns - 2;
  const featuredHeight = columnWidth * 2 / estimatedAspect.f + estimatedBodyHeight;
  const smallHeight = columnWidth / estimatedAspect.s + estimatedBodyHeight;
  const perColumn = Math.max(1, Math.round(featuredHeight / smallHeight));
  let pending = 0;
  campaigns.forEach((campaign) => {
    if (getCampaignVariant(campaign) === 'f') {
      segments.push({ kind: 'featured', campaign, companions: [] });
      pending = spare > 0 ? spare * perColumn : 0;
      return;
    }
    const last = segments[segments.length - 1];
    if (pending > 0 && last && last.kind === 'featured') {
      last.companions.push(campaign);
      pending -= 1;
      return;
    }
    pending = 0;
    if (last && last.kind === 'columns') last.campaigns.push(campaign);
    else segments.push({ kind: 'columns', campaigns: [campaign] });
  });
  return segments;
};

interface MasonryProps<T> {
  items: T[];
  columns: number;
  columnWidth: number;
  gap: number;
  renderItem: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
  weightOf: (item: T, columnWidth: number) => number;
}

const Masonry = <T,>({
  items,
  columns,
  columnWidth,
  gap,
  renderItem,
  keyOf,
  weightOf,
}: MasonryProps<T>) => {
  const buckets = useMemo(() => {
    const result: T[][] = Array.from({ length: columns }, () => []);
    const heights = new Array<number>(columns).fill(0);
    items.forEach((item) => {
      let target = 0;
      for (let i = 1; i < columns; i += 1) {
        if (heights[i] < heights[target]) target = i;
      }
      result[target].push(item);
      heights[target] += weightOf(item, columnWidth);
    });
    return result;
  }, [items, columns, columnWidth, weightOf]);

  return (
    <View style={[styles.columnsRow, { columnGap: gap }]}>
      {buckets.map((bucket, index) => (
        <View key={index} style={{ width: columnWidth }}>
          {bucket.map((item) => (
            <View key={keyOf(item)}>{renderItem(item)}</View>
          ))}
        </View>
      ))}
    </View>
  );
};

interface CampaignGridProps {
  campaigns: Campaign[];
  empty?: React.ReactNode;
}

export const CampaignGrid = ({ campaigns, empty }: CampaignGridProps) => {
  const window = useWindowDimensions();
  const actions = usePrezoCampaignActions();
  const [width, setWidth] = useState(0);
  const { gap, minColumn } = getMetrics(window.width);
  const columns = Math.max(1, Math.floor((width + gap) / (minColumn + gap)));
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const segments = useMemo(
    () => buildSegments(campaigns, columns, columnWidth),
    [campaigns, columns, columnWidth],
  );
  const featuredWidth = Math.min(width, columnWidth * 2 + gap);
  const companionColumns = Math.max(1, columns - 2);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  const renderCard = (campaign: Campaign) => (
    <CampaignCard
      campaign={campaign}
      onToggleSaved={actions.toggleSaved}
      onShare={actions.share}
    />
  );

  const weightOf = (campaign: Campaign, colWidth: number) =>
    colWidth / estimatedAspect[getCampaignVariant(campaign)] + estimatedBodyHeight;

  return (
    <View onLayout={onLayout} style={styles.grid}>
      {!campaigns.length ? empty : null}
      {width > 0 && campaigns.length
        ? segments.map((segment, index) =>
            segment.kind === 'featured' ? (
              <View key={segment.campaign.id} style={[styles.columnsRow, { columnGap: gap }]}>
                <View style={{ width: featuredWidth }}>{renderCard(segment.campaign)}</View>
                {segment.companions.length ? (
                  <Masonry
                    items={segment.companions}
                    columns={companionColumns}
                    columnWidth={columnWidth}
                    gap={gap}
                    renderItem={renderCard}
                    keyOf={(campaign) => campaign.id}
                    weightOf={weightOf}
                  />
                ) : null}
              </View>
            ) : (
              <Masonry
                key={`columns-${index}`}
                items={segment.campaigns}
                columns={columns}
                columnWidth={columnWidth}
                gap={gap}
                renderItem={renderCard}
                keyOf={(campaign) => campaign.id}
                weightOf={weightOf}
              />
            ),
          )
        : null}
    </View>
  );
};

const skeletonVariants = ['s', 'p', 'l', 's', 'p', 's'] as const;

interface SkeletonItem {
  id: string;
  variant: keyof typeof estimatedAspect;
}

const skeletonItems: SkeletonItem[] = skeletonVariants.map((variant, index) => ({
  id: String(index),
  variant,
}));

const skeletonWeight = (item: SkeletonItem, columnWidth: number) =>
  columnWidth / estimatedAspect[item.variant] + estimatedBodyHeight;

const Pulse = ({ children }: { children: React.ReactNode }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
};

export const CampaignSkeletonGrid = () => {
  const window = useWindowDimensions();
  const { colors } = usePrezoTheme();
  const [width, setWidth] = useState(0);
  const { gap, minColumn } = getMetrics(window.width);
  const columns = Math.max(1, Math.floor((width + gap) / (minColumn + gap)));
  const columnWidth = (width - gap * (columns - 1)) / columns;

  return (
    <View
      accessibilityLabel="Loading campaigns"
      onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}
      style={[styles.grid, { marginTop: 20 }]}
    >
      {width > 0 ? (
        <Pulse>
          <Masonry
            items={skeletonItems}
            columns={columns}
            columnWidth={columnWidth}
            gap={gap}
            keyOf={(item) => item.id}
            weightOf={skeletonWeight}
            renderItem={(item) => (
              <View
                style={[styles.skeleton, { backgroundColor: colors.s1, borderColor: colors.ln }]}
              >
                <View
                  style={{ aspectRatio: estimatedAspect[item.variant], backgroundColor: colors.s2 }}
                />
                <View style={styles.skeletonBody}>
                  <View style={[styles.skeletonLine, { backgroundColor: colors.s2 }]} />
                </View>
              </View>
            )}
          />
        </Pulse>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: '100%',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  skeleton: {
    borderWidth: prezoLayout.hairline,
    borderRadius: prezoRadii.r2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  skeletonBody: {
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  skeletonLine: {
    height: 34,
    borderRadius: 8,
  },
});

