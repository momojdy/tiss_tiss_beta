import React, { useId } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { artGradients } from '../../../theme/prezoTheme';
import { categoryGlyphs, fallbackGlyph, type GlyphShape } from '../shared/categoryGlyphs';
import { Chip } from '../shared/Chip';
import type { StatusChip } from '../../../lib/prezo/campaignRules';

interface CampaignArtProps {
  category: string;
  gradientIndex: number;
  imageUrl?: string | null;
  chip?: StatusChip | null;
  glyphWidth?: string;
  chipOffset?: number;
  compactChip?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '');

const renderShape = (shape: GlyphShape, index: number) => {
  if (shape.kind === 'path') {
    return (
      <Path
        key={index}
        d={shape.d}
        stroke="#ffffff"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }
  if (shape.kind === 'rect') {
    return (
      <Rect
        key={index}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        rx={shape.rx}
        stroke="#ffffff"
        strokeWidth={1.6}
        fill="none"
      />
    );
  }
  return (
    <Circle
      key={index}
      cx={shape.cx}
      cy={shape.cy}
      r={shape.r}
      stroke="#ffffff"
      strokeWidth={1.6}
      fill="none"
    />
  );
};

export const CampaignArt = ({
  category,
  gradientIndex,
  imageUrl,
  chip,
  glyphWidth = '46%',
  chipOffset = 12,
  compactChip = false,
  radius = 0,
  style,
}: CampaignArtProps) => {
  const gradientId = `ga${sanitize(useId())}`;
  const gradient = artGradients[gradientIndex % artGradients.length];
  const glyph = categoryGlyphs[category] ?? fallbackGlyph;

  let paint: React.ReactNode;
  if (gradient.type === 'linear') {
    const angle = (gradient.angle * Math.PI) / 180;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const k = Math.abs(sin) + Math.abs(cos);
    paint = (
      <LinearGradient
        id={gradientId}
        x1={0.5 - sin / (2 * k)}
        y1={0.5 + cos / (2 * k)}
        x2={0.5 + sin / (2 * k)}
        y2={0.5 - cos / (2 * k)}
      >
        <Stop offset="0" stopColor={gradient.from} />
        <Stop offset={gradient.stopAt} stopColor={gradient.to} />
        <Stop offset="1" stopColor={gradient.to} />
      </LinearGradient>
    );
  } else {
    paint = (
      <RadialGradient
        id={gradientId}
        cx={gradient.cx}
        cy={gradient.cy}
        fx={gradient.cx}
        fy={gradient.cy}
        rx={gradient.rx}
        ry={gradient.ry}
      >
        <Stop offset="0" stopColor={gradient.from} />
        <Stop offset="1" stopColor={gradient.to} />
      </RadialGradient>
    );
  }

  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            <Defs>{paint}</Defs>
            <Rect x="0" y="0" width="1" height="1" fill={`url(#${gradientId})`} />
          </Svg>
          <Svg
            accessibilityLabel={category}
            style={{ width: glyphWidth as `${number}%`, aspectRatio: 1, opacity: 0.9 }}
            viewBox="0 0 60 60"
            fill="none"
          >
            {glyph.map(renderShape)}
          </Svg>
        </>
      )}
      {chip ? (
        <Chip
          label={chip.label}
          tone={chip.tone}
          onArt
          compact={compactChip}
          style={[styles.chip, { top: chipOffset, left: chipOffset }]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    position: 'absolute',
  },
});

