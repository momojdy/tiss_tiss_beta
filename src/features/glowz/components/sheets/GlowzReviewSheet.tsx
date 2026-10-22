import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useBookings } from '../../hooks/useBookings';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { useGlowzTheme } from '../../styles/ThemeContext';
import { GlowzButton } from '../GlowzButton';
import { GlowzSheet } from '../GlowzSheet';
import { StarGlyph } from '../GlowzStars';
import { GlowzText } from '../GlowzText';
import { GlowzTextField } from '../GlowzTextField';

export function GlowzReviewSheet({ bookingRef }: { bookingRef: string }) {
  const { c } = useGlowzTheme();
  const { closeSheet } = useGlowzSheet();
  const { submitReview } = useBookings();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  return (
    <GlowzSheet title="Rate your visit" onClose={closeSheet}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} accessibilityState={{ selected: n <= stars }} hitSlop={4}>
            <StarGlyph size={38} color={n <= stars ? c.star : c.line} />
          </Pressable>
        ))}
      </View>
      <GlowzTextField value={text} onChangeText={setText} multiline numberOfLines={3} maxLength={500} placeholder="What went well? What could be better?" accessibilityLabel="Review" />
      <GlowzText kind="small" muted>Your review is tagged as a verified booking. Providers can reply but cannot remove it.</GlowzText>
      <GlowzButton label="Submit review" disabled={!stars} onPress={() => submitReview(bookingRef, stars, text)} />
    </GlowzSheet>
  );
}