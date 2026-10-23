import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { BackHandler } from 'react-native';
import {
  initialNavigationState,
  isRootRoute,
  popRoute,
  pushRoute,
  replaceRoute,
  routeKey,
  type NavigationState,
} from '../../lib/prezo/navigation';
import type { PrezoRoute } from '../../types/prezo';

type Action =
  | { type: 'push'; route: PrezoRoute }
  | { type: 'replace'; route: PrezoRoute }
  | { type: 'pop' };

const reducer = (state: NavigationState, action: Action): NavigationState => {
  switch (action.type) {
    case 'push':
      return pushRoute(state, action.route);
    case 'replace':
      return replaceRoute(state, action.route);
    default:
      return popRoute(state);
  }
};

interface NavigationValue {
  route: PrezoRoute;
  routeId: string;
  canGoBack: boolean;
  restoreScroll: boolean;
  navigate: (route: PrezoRoute) => void;
  replace: (route: PrezoRoute) => void;
  back: () => void;
  scrollOffsets: React.MutableRefObject<Record<string, number>>;
}

const PrezoNavigationContext = createContext<NavigationValue | null>(null);

interface ProviderProps {
  initialRoute?: PrezoRoute;
  onExitRequested?: () => void;
  children: React.ReactNode;
}

export const PrezoNavigationProvider = ({ initialRoute, onExitRequested, children }: ProviderProps) => {
  const [state, dispatch] = useReducer(
    reducer,
    initialRoute ? { stack: [initialRoute], restoreScroll: false } : initialNavigationState,
  );
  const scrollOffsets = useRef<Record<string, number>>({});
  const route = state.stack[state.stack.length - 1];

  const navigate = useCallback((next: PrezoRoute) => dispatch({ type: 'push', route: next }), []);
  const replace = useCallback((next: PrezoRoute) => dispatch({ type: 'replace', route: next }), []);
  const canGoBack = !isRootRoute(route);
  const back = useCallback(() => {
    if (canGoBack) {
      dispatch({ type: 'pop' });
      return;
    }
    if (route.name !== 'home') {
      dispatch({ type: 'push', route: { name: 'home' } });
      return;
    }
    onExitRequested?.();
  }, [canGoBack, route, onExitRequested]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack || route.name !== 'home') {
        back();
        return true;
      }
      if (onExitRequested) {
        onExitRequested();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack, route.name, back, onExitRequested]);

  const value = useMemo(
    () => ({
      route,
      routeId: routeKey(route),
      canGoBack,
      restoreScroll: state.restoreScroll,
      navigate,
      replace,
      back,
      scrollOffsets,
    }),
    [route, canGoBack, state.restoreScroll, navigate, replace, back],
  );

  return (
    <PrezoNavigationContext.Provider value={value}>{children}</PrezoNavigationContext.Provider>
  );
};

export const usePrezoNavigation = (): NavigationValue => {
  const value = useContext(PrezoNavigationContext);
  if (!value) throw new Error('usePrezoNavigation must be used inside PrezoNavigationProvider');
  return value;
};

