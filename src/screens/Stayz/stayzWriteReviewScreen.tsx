import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StayzButton } from './stayzButton';
import { StayzScreen } from './stayzScreen';
import { StayzErrorView, StayzSkeleton } from './stayzStates';
import { StayzStars } from './stayzStars';
import { StayzTextField } from './stayzTextField';
import { StayzTxt } from './stayzTxt';
import { useStayzAsync } from './stayzUseAsync';
import { RootProps } from './stayzNavigationTypes';
import { useStayzApi } from './stayzApiContext';
import { useStayzTheme } from './stayzThemeContext';

export const StayzWriteReviewScreen = ({ route }: RootProps<'WriteReview'>) => {
  const nav = useNavigation();
  const { colors } = useStayzTheme();
  const api = useStayzApi();
  const { data: b, loading, error, reload } = useStayzAsync(() => api.getBooking(route.params.id), [api, route.params.id]);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');

  if (loading) return <StayzScreen title="Write a review"><StayzSkeleton height={160} radius={18} /></StayzScreen>;
  if (error || !b) return <StayzScreen title="Write a review"><StayzErrorView message={error ?? undefined} onRetry={reload} /></StayzScreen>;

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
    <StayzScreen title="Write a review" footer={<StayzButton title="Submit review" onPress={submit} loading={busy} disabled={rating === 0} />}>
      <StayzTxt v="h2">{b.title}</StayzTxt>
      <View style={{ gap: 8 }}>
        <StayzTxt sub>How was your stay?</StayzTxt>
        <StayzStars value={rating} size={36} onChange={setRating} />
      </View>
      <StayzTextField label="Your review (optional)" value={text} onChangeText={setText} multiline maxLength={1000} placeholder="Tell other guests what you liked" />
      <StayzTxt v="small" sub>
        Reviews cannot be edited after you submit them.
      </StayzTxt>
      {failed ? <StayzTxt color={colors.danger}>{failed}</StayzTxt> : null}
    </StayzScreen>
  );
};
