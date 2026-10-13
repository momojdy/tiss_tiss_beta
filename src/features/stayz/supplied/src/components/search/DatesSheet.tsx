import React, { useEffect, useState } from 'react';
import { addDays, fmtDate } from '../../lib/dates';
import { useSearch } from '../../store/SearchContext';
import { Button } from '../Button';
import { Calendar } from '../Calendar';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';

interface Props {
  visible: boolean;
  onClose: () => void;
  blocked?: string[];
}

export const DatesSheet = ({ visible, onClose, blocked }: Props) => {
  const { search, setSearch } = useSearch();
  const range = search.mode === 'overnight' || search.mode === 'extended';
  const minNights = search.mode === 'extended' ? 7 : 1;
  const [a, setA] = useState(search.date);
  const [b, setB] = useState(search.endDate);

  useEffect(() => {
    if (visible) {
      setA(search.date);
      setB(search.endDate);
    }
  }, [visible, search.date, search.endDate]);

  const ready = range ? !!a && !!b && b > a : !!a;

  return (
    <Sheet visible={visible} title={range ? 'Select dates' : 'Select a date'} onClose={onClose}>
      <Calendar range={range} start={a} end={range ? b : undefined} blocked={blocked} minNights={minNights} onChange={(s, e) => (setA(s), setB(e))} />
      <Txt sub>
        {range ? (a && b ? `${fmtDate(a)} to ${fmtDate(b)}` : a ? `${fmtDate(a)} · choose check-out${minNights > 1 ? ` (min ${minNights} nights)` : ''}` : 'Choose check-in') : a ? fmtDate(a) : ''}
      </Txt>
      <Button
        title="Done"
        disabled={!ready}
        onPress={() => {
          setSearch({ date: a, endDate: range ? b : addDays(a, 1) });
          onClose();
        }}
      />
    </Sheet>
  );
};
