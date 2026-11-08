import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { darkTheme, lightTheme, ThemeContext } from '../../theme/gatherzTheme';
import { createDemoRepository } from '../../data/gatherz/demoRepository';
import { isRoot, navReducer, ROUTES, type RouteName } from '../../lib/gatherz/navigation';
import type { GatherzRepository } from '../../types/gatherz';
import { BottomNav } from '../../components/gatherz/shared';
import { GatherzContext } from './GatherzContext';
import GatherzQuickMenu from './GatherzQuickMenu';
import GatherzHomeScreen from '../../screens/Gatherz/GatherzHomeScreen';
import GatherzExploreScreen from '../../screens/Gatherz/GatherzExploreScreen';
import GatherzEventScreen from '../../screens/Gatherz/GatherzEventScreen';
import GatherzTicketsScreen from '../../screens/Gatherz/GatherzTicketsScreen';
import GatherzTicketScreen from '../../screens/Gatherz/GatherzTicketScreen';
import GatherzCheckoutScreen from '../../screens/Gatherz/GatherzCheckoutScreen';
import GatherzReceiptScreen from '../../screens/Gatherz/GatherzReceiptScreen';
import GatherzOrdersScreen from '../../screens/Gatherz/GatherzOrdersScreen';
import GatherzDemoControlsScreen from '../../screens/Gatherz/GatherzDemoControlsScreen';
import GatherzSecondaryScreen from '../../screens/Gatherz/GatherzSecondaryScreen';
import GatherzScannerScreen from '../../screens/Gatherz/GatherzScannerScreen';
import GatherzShareScreen from '../../screens/Gatherz/GatherzShareScreen';
import GatherzGroupScreen from '../../screens/Gatherz/GatherzGroupScreen';
import GatherzOrganizerScreen from '../../screens/Gatherz/GatherzOrganizerScreen';
import GatherzSocialActionsScreen from '../../screens/Gatherz/GatherzSocialActionsScreen';
import GatherzTicketActionsScreen from '../../screens/Gatherz/GatherzTicketActionsScreen';
import GatherzPlaceholderScreen from '../../screens/Gatherz/GatherzPlaceholderScreen';
import { GatherzHelpScreen, GatherzHelpArticleScreen, GatherzSupportScreen, GatherzPreferencesScreen, GatherzNotificationsScreen } from '../../screens/Gatherz/GatherzUtilityScreens';
import { GatherzCommunityProvider } from './GatherzCommunityContext';
import { GatherzActivityProvider } from './GatherzActivityContext';
import { GatherzCheckoutProvider } from './GatherzCheckoutContext';
import { GatherzReviewScreen, GatherzPaymentScreen, GatherzPaymentFailedScreen, GatherzConfirmationScreen } from '../../screens/Gatherz/GatherzCheckoutSteps';
import { GatherzFavoritesScreen, GatherzMomentsScreen, GatherzCirclesScreen, GatherzCircleDetailScreen } from '../../screens/Gatherz/GatherzCommunityScreens';
export interface GatherzEntryProps { repository?: GatherzRepository; initialTheme?: 'light' | 'dark'; onExit?: () => void; onWalletPress?: () => void; onBusinessSpacePress?: () => void; onRecentActivityPress?: () => void; onMainHomePress?: () => void; onMessagesPress?: () => void; onNotificationsPress?: () => void; unreadNotifications?: number; unreadMessages?: number }
/** Mounts like Prezo/Goodies: it owns its internal stack and calls onExit when Back is pressed on the first screen. */
export default function GatherzStandaloneEntry({ repository, initialTheme = 'light', onExit, onWalletPress, onBusinessSpacePress, onRecentActivityPress, onMainHomePress, onMessagesPress, onNotificationsPress, unreadNotifications = 0, unreadMessages = 0 }: GatherzEntryProps) {
  const [demoAccount, setDemoAccount] = useState('Alex');
  const demoRepositories = useMemo(() => Object.fromEntries(['Alex', 'Jamie', 'Sam', 'Staff', 'Host'].map(name => [name, createDemoRepository()])), []);
  const repo = repository ?? demoRepositories[demoAccount];
  const [stack, dispatch] = useReducer(navReducer, [{ route: 'home' as RouteName }]);
  const [dark, setDark] = useState(initialTheme === 'dark');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const top = stack[stack.length - 1], root = isRoot(top);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (stack.length > 1) { dispatch({ type: 'back' }); return true; } onExit?.(); return true; });
    return () => sub.remove();
  }, [stack.length, onExit]);
  const push = useCallback((route: RouteName, id?: string) => dispatch({ type: 'push', entry: { route, params: id ? { id } : undefined } }), []);
  const goBack = useCallback(() => { if (stack.length > 1) dispatch({ type: 'back' }); else onExit?.(); }, [stack.length, onExit]);
  const ctx = useMemo(() => ({ openQuickMenu: () => setQuickMenuOpen(true), openMainHome: onMainHomePress, openMessages: onMessagesPress, openNotifications: onNotificationsPress, unreadNotifications, unreadMessages, openWallet: onWalletPress, openBusinessSpace: onBusinessSpacePress, openRecentActivity: onRecentActivityPress, repo, now: Date.now(), root, demoAccount, switchDemoAccount: repository ? undefined : (account: string) => { if (account in demoRepositories) { setDemoAccount(account); dispatch({ type: 'tab', route: 'home' }); } }, nav: { push, back: goBack, tab: (route: RouteName) => dispatch({ type: 'tab', route }) }, toggleTheme: () => setDark(d => !d) }), [repo, root, push, goBack, demoAccount, demoRepositories, repository, onWalletPress, onBusinessSpacePress, onRecentActivityPress, onMainHomePress, onMessagesPress, onNotificationsPress, unreadNotifications, unreadMessages]);
  const id = top.params?.id ?? '';
  const screen = top.route === 'home' ? <GatherzHomeScreen /> : top.route === 'explore' ? <GatherzExploreScreen /> : top.route === 'event' ? <GatherzEventScreen id={id} /> : top.route === 'tickets' ? <GatherzTicketsScreen /> : (top.route === 'ticket' || top.route === 'tk') ? <GatherzTicketScreen id={id} /> : top.route === 'buy' ? <GatherzCheckoutScreen id={id} /> : top.route === 'rv' ? <GatherzReviewScreen id={id} /> : top.route === 'pm' ? <GatherzPaymentScreen id={id} /> : top.route === 'pf' ? <GatherzPaymentFailedScreen id={id} /> : top.route === 'ok' ? <GatherzConfirmationScreen id={id} /> : top.route === 'rc' ? <GatherzReceiptScreen id={id} /> : top.route === 'ords' ? <GatherzOrdersScreen /> : top.route === 'dc' ? <GatherzDemoControlsScreen /> : top.route === 'bs' ? <GatherzScannerScreen /> : ['all','msgs'].includes(top.route) ? <GatherzSecondaryScreen mode={top.route as 'all' | 'msgs'} section={id} /> : top.route === 'grp' ? <GatherzGroupScreen id={id} /> : top.route === 'favorites' ? <GatherzFavoritesScreen /> : top.route === 'moments' ? <GatherzMomentsScreen /> : top.route === 'circles' ? <GatherzCirclesScreen /> : top.route === 'ci' ? <GatherzCircleDetailScreen id={id} /> : top.route === 'org' ? <GatherzOrganizerScreen id={id} /> : ['mp', 'mv', 'pst', 'inv', 'rp', 'mem'].includes(top.route) ? <GatherzSocialActionsScreen mode={top.route as 'mp' | 'mv' | 'pst' | 'inv' | 'rp' | 'mem'} id={id} /> : top.route === 'help' ? <GatherzHelpScreen /> : top.route === 'ha' ? <GatherzHelpArticleScreen id={id} /> : top.route === 'cs' ? <GatherzSupportScreen /> : top.route === 'sc' ? <GatherzSupportScreen id={id} /> : top.route === 'prefs' ? <GatherzPreferencesScreen /> : top.route === 'notif' ? <GatherzNotificationsScreen /> : top.route === 'sh' ? <GatherzShareScreen id={id} /> : ['send', 'claim', 'rf', 'dl'].includes(top.route) ? <GatherzTicketActionsScreen id={id} action={top.route as 'send' | 'claim' | 'rf' | 'dl'} /> : <GatherzPlaceholderScreen title={ROUTES[top.route].title} />;
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={dark ? darkTheme : lightTheme}>
        <GatherzContext.Provider value={ctx}>
          <GatherzActivityProvider key={demoAccount}><GatherzCheckoutProvider><GatherzCommunityProvider>
          <View style={{ flex: 1 }}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            {screen}
            <GatherzQuickMenu visible={quickMenuOpen} close={() => setQuickMenuOpen(false)} />
            {root ? <BottomNav active={top.route} onTab={r => ctx.nav.tab(r)} /> : null}
          </View>
          </GatherzCommunityProvider></GatherzCheckoutProvider></GatherzActivityProvider>
        </GatherzContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}