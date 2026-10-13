import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ErrorView, Skeleton } from '../components/States';
import { Stars } from '../components/Stars';
import { TextField } from '../components/TextField';
import { Txt } from '../components/Txt';
import { useAsync } from '../hooks/useAsync';
import { RootProps } from '../navigation/types';
import { useApi } from '../store/ApiContext';
import { useTheme } from '../theme/ThemeContext';

export const WriteReviewScreen = ({ route }: RootProps<'WriteReview'>) => {
  const nav = useNavigation();
  const { colors } = useTheme();
  const api = useApi();
  const { data: b, loading, error, reload } = useAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  if (loading) return <Screen title="Write a review"><Skeleton height={160} radius={18} /></Screen>;
  if (error || !b) return <Screen title="Write a review"><ErrorView message={error ?? undefined} onRetry={reload} /></Screen>;

  const submit = async () => {
    setBusy(true);
    setFailed('');
    try {
      await api.submitReview(b.id, rating, text.trim());
      nav.goBack();
    } catch {
      setFailed('Your review could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Write a review" footer={<Button title="Submit review" onPress={submit} loading={busy} disabled={rating === 0} />}>
      <Txt v="h2">{b.title}</Txt>
      <View style={{ gap: 8 }}>
        <Txt sub>How was your stay?</Txt>
        <Stars value={rating} size={36} onChange={setRating} />
      </View>
      <TextField label="Your review (optional)" value={text} onChangeText={setText} multiline maxLength={1000} placeholder="Tell other guests what you liked" />
      <Txt v="small" sub>
        Reviews cannot be edited after you submit them.
      </Txt>
      {failed ? <Txt color={colors.danger}>{failed}</Txt> : null}
    </Screen>
  );
};
