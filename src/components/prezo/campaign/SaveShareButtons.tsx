import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { usePrezoTheme } from '../../../features/prezo/PrezoThemeContext';
import { Icon } from '../shared/Icon';

interface SaveButtonProps {
  title: string;
  saved: boolean;
  onPress: () => void;
}

export const CardSaveButton = ({ title, saved, onPress }: SaveButtonProps) => {
  const { colors } = usePrezoTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${saved ? 'Unsave' : 'Save'} ${title}`}
      onPress={onPress}
      style={[styles.button, { right: 10, backgroundColor: saved ? colors.rd : 'rgba(0,0,0,0.55)' }]}
    >
      <Icon name="heart" size={16} color="#ffffff" filled={saved} />
    </Pressable>
  );
};

interface ShareButtonProps {
  title: string;
  onPress: () => void;
}

export const CardShareButton = ({ title, onPress }: ShareButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Share ${title}`}
    onPress={onPress}
    style={[styles.button, { right: 50, backgroundColor: 'rgba(0,0,0,0.55)' }]}
  >
    <Icon name="share" size={16} color="#ffffff" />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

