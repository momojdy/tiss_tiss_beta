import React, { useState } from 'react';
import { usePrezoData } from '../../features/prezo/PrezoDataContext';
import { usePrezoNavigation } from '../../features/prezo/PrezoNavigationContext';
import { Button } from '../../components/prezo/shared/Button';
import { PageTitle } from '../../components/prezo/shared/PageHeading';
import { PzText } from '../../components/prezo/shared/PzText';
import { ScreenScaffold } from '../../components/prezo/shared/ScreenScaffold';
import { OptionPill, OptionRow } from '../../components/prezo/shared/Selectors';
import { Sheet, SheetActions } from '../../components/prezo/shared/Sheet';
import { FieldError, TextField } from '../../components/prezo/shared/TextField';
import type { ReportCategory } from '../../types/prezo';

const categories: ReportCategory[] = ['Payment', 'Fallback offer', 'Refund', 'Fulfilment', 'Other'];

export const PrezoReportScreen = ({ relatedId }: { relatedId: string | null }) => {
  const data = usePrezoData();
  const navigation = usePrezoNavigation();
  const [category, setCategory] = useState<ReportCategory>('Payment');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    if (message.trim().length < 10) {
      setError('Describe the problem in at least 10 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await data.submitReport({
        category,
        relatedId,
        message: message.trim(),
      });
      setReference(result.reference);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Couldn’t send the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold>
      <PageTitle>Report a problem</PageTitle>
      <PzText size={13} tone="mu" style={{ marginTop: 14, marginBottom: 6 }}>
        Category
      </PzText>
      <OptionRow>
        {categories.map((item) => (
          <OptionPill
            key={item}
            label={item}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </OptionRow>
      <PzText size={13} tone="mu">
        Related: {relatedId ?? 'none'}
      </PzText>
      <TextField
        multiline
        value={message}
        onChangeText={setMessage}
        placeholder="What happened?"
        accessibilityLabel="What happened?"
        style={{ marginVertical: 10 }}
      />
      <FieldError message={error} />
      <Button label="Send report" loading={busy} onPress={send} style={{ marginTop: 10 }} />
      <Sheet
        visible={!!reference}
        onClose={() => {
          setReference(null);
          navigation.back();
        }}
        title="Report received"
      >
        <PzText tone="mu">Reference {reference}.</PzText>
        <SheetActions>
          <Button
            label="Done"
            onPress={() => {
              setReference(null);
              navigation.back();
            }}
          />
        </SheetActions>
      </Sheet>
    </ScreenScaffold>
  );
};

