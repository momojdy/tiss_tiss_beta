import React from 'react';
import { View } from 'react-native';
import { useStayzSearch } from './stayzSearchContext';
import { StayzButton } from './stayzButton';
import { StayzSheet } from './stayzSheet';
import { StayzStepper } from './stayzStepper';
import { StayzTxt } from './stayzTxt';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const StayzGuestsSheet = ({ visible, onClose }: Props) => {
  const { search, setSearch } = useStayzSearch();
  const line = (label: string, hint: string, value: number, min: number, key: 'adults' | 'children' | 'rooms') => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <StayzTxt v="h3">{label}</StayzTxt>
        <StayzTxt v="small" sub>
          {hint}
        </StayzTxt>
      </View>
      <StayzStepper value={value} min={min} max={key === 'rooms' ? 10 : 20} onChange={v => setSearch({ [key]: v })} />
    </View>
  );
  return (
    <StayzSheet visible={visible} title="Guests" onClose={onClose}>
      {line('Adults', 'Age 13 and over', search.adults, 1, 'adults')}
      {line('Children', 'Under 13', search.children, 0, 'children')}
      {search.mode === 'overnight' || search.mode === 'extended' ? line('Rooms', 'How many rooms you need', search.rooms, 1, 'rooms') : null}
      <StayzButton title="Done" onPress={onClose} />
    </StayzSheet>
  );
};
