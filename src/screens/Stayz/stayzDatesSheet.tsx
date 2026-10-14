import React, { useEffect, useState } from 'react';
import { addDays, fmtDate } from './stayzDates';
import { useStayzSearch } from './stayzSearchContext';
import { StayzButton } from './stayzButton';
import { StayzCalendar } from './stayzCalendar';
import { StayzSheet } from './stayzSheet';
import { StayzTxt } from './stayzTxt';

interface Props {
  visible: boolean;
  onClose: () => void;
  blocked?: string[];
}

export const StayzDatesSheet = ({ visible, onClose, blocked }: Props) => {
  const { search, setSearch } = useStayzSearch();
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
    <StayzSheet visible={visible} title={range ? 'Select dates' : 'Select a date'} onClose={onClose}>
      <StayzCalendar range={range} start={a} end={range ? b : undefined} blocked={blocked} minNights={minNights} onChange={(s, e) => (setA(s), setB(e))} />
      <StayzTxt sub>
        {range ? (a && b ? `${fmtDate(a)} to ${fmtDate(b)}` : a ? `${fmtDate(a)} · choose check-out${minNights > 1 ? ` (min ${minNights} nights)` : ''}` : 'Choose check-in') : a ? fmtDate(a) : ''}
      </StayzTxt>
      <StayzButton
        title="Done"
        disabled={!ready}
        onPress={() => {
          setSearch({ date: a, endDate: range ? b : addDays(a, 1) });
          onClose();
        }}
      />
    </StayzSheet>
  );
};
