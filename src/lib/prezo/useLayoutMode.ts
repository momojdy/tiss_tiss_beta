import { useWindowDimensions } from 'react-native';
import { prezoLayout } from '../../theme/prezoTheme';

export interface LayoutMode {
  width: number;
  height: number;
  isWide: boolean;
  isTablet: boolean;
  pageTitleSize: number;
}

export const useLayoutMode = (): LayoutMode => {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= prezoLayout.desktopBreakpoint,
    isTablet: width >= prezoLayout.tabletBreakpoint,
    pageTitleSize: Math.min(30, Math.max(24, width * 0.05)),
  };
};

