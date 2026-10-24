import { useFonts } from 'expo-font';
import {
  Montserrat_500Medium as BricolageGrotesque_500Medium,
  Montserrat_700Bold as BricolageGrotesque_700Bold,
  Montserrat_800ExtraBold as BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';

export const usePrezoFonts = (): boolean => {
  const [loaded, error] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
  });
  return loaded || !!error;
};

