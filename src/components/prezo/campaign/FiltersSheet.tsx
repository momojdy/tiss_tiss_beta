import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePrezoFormat } from '../../../features/prezo/PrezoEnvironment';
import {
  defaultExploreFilters,
  modeFilterOptions,
  sortOptions,
  statusFilterOptions,
  type ExploreFilters,
} from '../../../lib/prezo/campaignFilters';
import { Button } from '../shared/Button';
import { PzText } from '../shared/PzText';
import { OptionPill, OptionRow } from '../shared/Selectors';
import { Sheet, SheetActions } from '../shared/Sheet';
import { PriceSlider } from './PriceSlider';

interface FiltersSheetProps {
  visible: boolean;
  filters: ExploreFilters;
  priceBounds: { min: number; max: number } | null;
  onApply: (filters: ExploreFilters) => void;
  onClose: () => void;
}

export const FiltersSheet = ({
  visible,
  filters,
  priceBounds,
  onApply,
  onClose,
}: FiltersSheetProps) => {
  const fmt = usePrezoFormat();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const clear = () =>
    setDraft({ ...defaultExploreFilters, query: draft.query, quick: draft.quick });

  return (
    <Sheet visible={visible} onClose={onClose} title="Filters">
      <PzText size={13} tone="mu" style={{ marginTop: 14, marginBottom: 6 }}>
        Status
      </PzText>
      <OptionRow>
        {statusFilterOptions.map((option) => (
          <OptionPill
            key={option.key}
            label={option.label}
            selected={draft.status === option.key}
            onPress={() => setDraft({ ...draft, status: option.key })}
          />
        ))}
      </OptionRow>
      <PzText size={13} tone="mu" style={{ marginBottom: 6 }}>
        Order type
      </PzText>
      <OptionRow>
        {modeFilterOptions.map((option) => (
          <OptionPill
            key={option.key}
            label={option.label}
            selected={draft.mode === option.key}
            onPress={() => setDraft({ ...draft, mode: option.key })}
          />
        ))}
      </OptionRow>
      {priceBounds ? (
        <View>
          <PzText size={13} tone="mu">
            Max price:{' '}
            <PzText size={13} weight={600}>
              {fmt.money(draft.maxPrice ?? priceBounds.max)}
            </PzText>
          </PzText>
          <PriceSlider
            min={priceBounds.min}
            max={priceBounds.max}
            value={draft.maxPrice ?? priceBounds.max}
            label="Maximum price"
            onChange={(value) =>
              setDraft({ ...draft, maxPrice: value >= priceBounds.max ? null : value })
            }
          />
        </View>
      ) : null}
      <PzText size={13} tone="mu" style={{ marginTop: 14, marginBottom: 6 }}>
        Sort
      </PzText>
      <OptionRow>
        {sortOptions.map((option) => (
          <OptionPill
            key={option.key}
            label={option.label}
            selected={draft.sort === option.key}
            onPress={() => setDraft({ ...draft, sort: option.key })}
          />
        ))}
      </OptionRow>
      <SheetActions>
        <Button
          label="Apply"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
        <Button label="Clear" variant="ghost" onPress={clear} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </SheetActions>
    </Sheet>
  );
};

