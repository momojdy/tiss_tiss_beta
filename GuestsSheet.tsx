import React from 'react';
import { View } from 'react-native';
import { useSearch } from '../../store/SearchContext';
import { Button } from '../Button';
import { Sheet } from '../Sheet';
import { Stepper } from '../Stepper';
import { Txt } from '../Txt';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const GuestsSheet = ({ visible, onClose }: Props) => {
  const { search, setSearch } = useSearch();
  const line = (label: string, hint: string, value: number, min: number, key: 'adults' | 'children' | 'rooms') => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Txt v="h3">{label}</Txt>
        <Txt v="small" sub>
          {hint}
        </Txt>
      </View>
      <Stepper value={value} min={min} max={key === 'rooms' ? 10 : 20} onChange={v => setSearch({ [key]: v })} />
    </View>
  );
  return (
    <Sheet visible={visible} title="Guests" onClose={onClose}>
      {line('Adults', 'Age 13 and over', search.adults, 1, 'adults')}
      {line('Children', 'Under 13', search.children, 0, 'children')}
      {search.mode === 'overnight' || search.mode === 'extended' ? line('Rooms', 'How many rooms you need', search.rooms, 1, 'rooms') : null}
      <Button title="Done" onPress={onClose} />
    </Sheet>
  );
};
