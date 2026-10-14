import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AuthScreen from './src/screens/Main/mainAuthScreen';
import StayzGuestScreen from './src/features/stayz/StayzGuestScreen';
import ForgotPasswordScreen from './src/screens/Main/mainForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/Main/mainResetPasswordScreen';
import WalletHomeScreen from './src/screens/Wallet/WalletHomeScreen';
import SettingsScreen from './src/screens/Main/mainSettingsScreen';
import SettingsDetailScreen, { type SettingsDetailKey } from './src/screens/Main/mainSettingsDetailScreen';
import AddressesScreen from './src/screens/Main/mainAddressesScreen';
import PersonalInformationScreen from './src/screens/Main/mainPersonalInformationScreen';
import AccountSecurityScreen from './src/screens/Main/mainAccountSecurityScreen';
import WalletNotificationsScreen from './src/screens/Wallet/WalletNotificationsScreen';
import MessageHubScreen from './src/screens/Main/mainMessageHubScreen';
import NotificationsScreen from './src/screens/Main/mainNotificationsScreen';
import MessagesScreen from './src/screens/Main/mainMessagesScreen';
import WalletSettingsScreen from './src/screens/Wallet/WalletSettingsScreen';
import WalletPaymentMethodsScreen from './src/screens/Wallet/WalletPaymentMethodsScreen';
import WalletBankCardsScreen from './src/screens/Wallet/WalletBankCardsScreen';
import WalletAddNewCardScreen from './src/screens/Wallet/WalletAddNewCardScreen';
import WalletPersonalInfoScreen from './src/screens/Wallet/WalletPersonalInfoScreen';
import WalletNotificationSettingsScreen from './src/screens/Wallet/WalletNotificationSettingsScreen';
import WalletHistoryScreen from './src/screens/Wallet/WalletHistoryScreen';
import WalletRecentActivityScreen from './src/screens/Wallet/WalletRecentActivityScreen';
import QRIdentityScreen from './src/screens/Main/mainQRIdentityScreen';
import PublicBuyerProfileScreen from './src/screens/Main/mainPublicBuyerProfileScreen';
import FlyzMomentsScreen from './src/screens/Flyz/FlyzMomentsScreen';
import ProfilePrivacyScreen from './src/screens/Main/mainProfilePrivacyScreen';
import WalletQRRecipientScreen from './src/screens/Wallet/WalletQRRecipientScreen';
import VendorShopScreen from './src/screens/Main/mainVendorShopScreen';
import FrenziesHomeScreen from './src/screens/Frenzies/FrenziesHomeScreen';
import KonsolissHomeScreen from './src/screens/Main/mainKonsolissHomeScreen';
import GoodiesHomeScreen from './src/screens/Main/mainGoodiesHomeScreen';
import WoulibFlow from './src/features/woulib/WoulibFlow';
import FlyzHomeScreen from './src/screens/Flyz/FlyzHomeScreen';
import FlyzMyTripsScreen from './src/screens/Flyz/FlyzMyTripsScreen';
import FlyzDealsScreen from './src/screens/Flyz/FlyzDealsScreen';
import FlyzDestinationScreen from './src/screens/Flyz/FlyzDestinationScreen';
import FlyzResultsScreen from './src/screens/Flyz/FlyzResultsScreen';
import FlyzDetailsScreen from './src/screens/Flyz/FlyzDetailsScreen';
import FlyzPassengerDetailsScreen from './src/screens/Flyz/FlyzPassengerDetailsScreen';
import FlyzPaymentScreen from './src/screens/Flyz/FlyzPaymentScreen';
import FrenziesDemoScreen from './src/screens/Frenzies/FrenziesDemoScreen';
import FrenziesRpsLobbyScreen from './src/screens/Frenzies/FrenziesRpsLobbyScreen';
import FrenziesRpsGameScreen from './src/screens/Frenzies/FrenziesRpsGameScreen';
import FrenziesOnlinePlayersScreen from './src/screens/Frenzies/FrenziesOnlinePlayersScreen';
import FrenziesChallengeInboxScreen, { DEMO_CHALLENGES } from './src/screens/Frenzies/FrenziesChallengeInboxScreen';
import FrenziesChallengeStatusScreen from './src/screens/Frenzies/FrenziesChallengeStatusScreen';
import FrenziesRankingScreen from './src/screens/Frenzies/FrenziesRankingScreen';
import FrenziesStreakShieldScreen from './src/screens/Frenzies/FrenziesStreakShieldScreen';
import FrenziesGetStreakShieldScreen from './src/screens/Frenzies/FrenziesGetStreakShieldScreen';
import FrenziesStreakShieldCheckoutScreen from './src/screens/Frenzies/FrenziesStreakShieldCheckoutScreen';
import { supabase } from './src/lib/supabase';
import BusinessSpaceScreen from './BusinessSpaceScreen';

type Screen = 'auth' | 'forgot' | 'reset';
type AppMode = 'buyer' | 'vendor';

function resolveAppMode(role: unknown): AppMode {
  const value = String(role ?? '').trim().toLowerCase();
  return ['vendor', 'business', 'seller', 'merchant'].includes(value) ? 'vendor' : 'buyer';
}

type RequestedMode = 'buyer' | 'business';

type BuyerScreen = 'home' | 'messageHub' | 'notifications' | 'messages' | 'me' | 'settings' | 'accountSecurity' | 'settingsDetail' | 'addresses' | 'personalInformation' | 'frenzies' | 'frenziesRpsLobby' | 'frenziesDemo' | 'frenziesRpsGame' | 'frenziesOnlinePlayers' | 'frenziesChallenges' | 'frenziesChallengeStatus' | 'frenziesChallengeReady' | 'frenziesRankings' | 'frenziesStreakShield' | 'frenziesGetStreakShield' | 'frenziesShieldCheckout' | 'wallet' | 'walletNotifications' | 'walletNotificationSettings' | 'walletSettings' | 'walletPersonalInfo' | 'walletPaymentMethods' | 'walletBankCards' | 'walletAddNewCard' | 'walletHistory' | 'qrIdentity' | 'vendorShop' | 'publicBuyerProfile' | 'profilePrivacy' | 'flyzMoments' | 'walletQrRecipient' | 'flyz' | 'flyzMyTrips' | 'flyzDeals' | 'flyzDestination' | 'flyzResults' | 'flyzDetails' | 'flyzPassengerDetails' | 'flyzPayment' | 'konsoliss' | 'goodies' | 'woulib' | 'stayz';

const AUTH_REQUEST_TIMEOUT_MS = 15000;

function withAuthRequestTimeout<T>(request: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out. Please check your connection and try again.`)), AUTH_REQUEST_TIMEOUT_MS);
    Promise.resolve(request).then(
      value => { clearTimeout(timeout); resolve(value); },
      error => { clearTimeout(timeout); reject(error); },
    );
  });
}

type AppErrorProps = { title: string; error: unknown };

function AppError({ title, error }: AppErrorProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View style={{ flex: 1, backgroundColor: '#F3F1F2', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#16181B', marginBottom: 12, textAlign: 'center' }}>{title}</Text>
      <Text style={{ fontSize: 14, color: '#77747A', textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

function FrenziesChallengeLayer({ children, showChallenge, onPress, onDismiss }: { children: React.ReactNode; showChallenge: boolean; onPress: () => void; onDismiss: () => void }) {
  return <View style={{ flex: 1 }}>{children}{showChallenge && <ChallengePlaceholder count={DEMO_CHALLENGES.length} onPress={onPress} onDismiss={onDismiss} />}</View>;
}

function ChallengePlaceholder({ count, onPress, onDismiss }: { count: number; onPress: () => void; onDismiss: () => void }) {
  const { PanResponder, Animated } = require('react-native');
  const pan = React.useRef(new Animated.ValueXY()).current;
  const responder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 || Math.abs(g.dx) > 8,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dy < -70 || g.dx > 100) { Animated.timing(pan, { toValue: { x: g.dx || 240, y: -180 }, duration: 180, useNativeDriver: false }).start(onDismiss); }
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  }), [pan, onDismiss]);
  return <Animated.View {...responder.panHandlers} style={{ position: 'absolute', top: 54, left: 14, right: 14, zIndex: 1000, transform: [{ translateX: pan.x }, { translateY: pan.y }], backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 0, borderColor: 'transparent', borderRadius: 10, padding: 15, height: 94, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}><Pressable onPress={onPress}><Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2517' }}>{count === 1 ? 'New challenge' : count + ' challenges waiting'}</Text><Text style={{ marginTop: 4, fontSize: 12, color: '#6F747A' }}>{count === 1 ? 'Maya challenged you to Rock Paper Scissors.' : 'Tap to view all pending challenges.'}</Text><View style={{ height: 1.5, backgroundColor: '#EE6B2E', borderRadius: 1, marginTop: 16, marginHorizontal: 20 }} /></Pressable></Animated.View>;
}

function AppContent({ registerChallengePress, registerChallengeDismiss, registerAuthenticated, registerVendorMode, registerBuyerScreen }: { registerChallengePress: (fn: () => void) => void; registerChallengeDismiss: (fn: () => void) => void; registerAuthenticated: (value: boolean) => void; registerVendorMode: (value: boolean) => void; registerBuyerScreen: (value: BuyerScreen) => void }) {
  const [fontsLoaded] = useFonts({ Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'), Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'), Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'), Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf') });
  const [screen, setScreen] = useState<Screen>('auth');
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('buyer');
  const [authInitialMode, setAuthInitialMode] = useState<RequestedMode>('buyer');
  const routeAuthenticatedUser = async (requestedMode: RequestedMode = 'buyer') => {
    const { data: userResult, error: userError } = await withAuthRequestTimeout(supabase.auth.getUser(), 'Checking your session');
    if (userError) throw userError;
    const user = userResult.user;
    if (!user) throw new Error('Your session has expired. Please sign in again.');

    const { data: modes, error: modesError } = await withAuthRequestTimeout(supabase.rpc('get_my_account_modes'), 'Checking your account access');
    if (modesError) throw modesError;
    const hasRequestedMode = requestedMode === 'buyer' ? modes?.buyer === true : modes?.business === true;
    if (!hasRequestedMode) {
      await supabase.auth.signOut();
      throw new Error(requestedMode === 'buyer'
        ? 'This Wantiss account is not registered in Buyer mode yet. Choose Register with Buyer selected.'
        : 'This Wantiss account is not registered in B&P 2P mode yet. Choose Register with B&P 2P selected.');
    }

    setBuyerScreen('home');
    if (requestedMode === 'buyer') {
      setAppMode('buyer');
    } else {
      // Business name/application is optional: authenticated business-mode users
      // enter Business Space directly. Access verification belongs in feature
      // actions, not as a mandatory name-entry screen before the dashboard.
      setAppMode('vendor');
    }
    setAuthenticated(true);
    setScreen('auth');
  };

  const handleOpenBusinessSpace = async () => {
    try {
      const { data: modes, error } = await supabase.rpc('get_my_account_modes');
      if (error) throw error;
      if (modes?.business === true) {
        setAppMode('vendor');
        setBuyerScreen('home');
        return;
      }
      Alert.alert(
        'Register for Business Space',
        'Your account does not have B&P 2P mode yet. Register separately with B&P 2P selected. Your Buyer account will remain separate.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue to registration',
            onPress: () => {
              void (async () => {
                await supabase.auth.signOut();
                setAuthenticated(false);
                setAppMode('buyer');
                setAuthInitialMode('business');
                setScreen('auth');
              })().catch(error => Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.'));
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Business Space unavailable', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  useEffect(() => {
    let mounted = true;
    // Always show Auth first when Expo starts. Supabase still hydrates its persisted
    // session internally, but an existing session must not skip the explicit Auth screen.
    void supabase.auth.getSession().then(({ error }) => {
      if (error) console.error('Unable to read saved Wantiss session:', error);
    }).catch(error => {
      console.error('Unable to read saved Wantiss session:', error);
    }).finally(() => {
      if (mounted) setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setAuthenticated(false);
        setAppMode('buyer');
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => { registerAuthenticated(authenticated); }, [authenticated, registerAuthenticated]);
  useEffect(() => { registerVendorMode(appMode !== 'buyer'); }, [appMode, registerVendorMode]);
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>('home');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) { setUnreadNotificationsCount(0); setUnreadMessagesCount(0); } return; }
      const { count: notificationCount, error: notificationError } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
      if (!notificationError && alive) setUnreadNotificationsCount(notificationCount ?? 0);
      const { data: conversations } = await supabase.from('conversations').select('id').contains('participant_ids', [user.id]);
      if (conversations?.length) {
        const { count: messageCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', conversations.map((conversation: { id: string }) => conversation.id)).is('read_at', null).neq('sender_id', user.id);
        if (alive) setUnreadMessagesCount(messageCount ?? 0);
      } else if (alive) setUnreadMessagesCount(0);
    };
    void load();
    channel = supabase.channel('app-unread-counts').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { void load(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void load(); }).subscribe();
    return () => { alive = false; if (channel) void supabase.removeChannel(channel); };
  }, [authenticated]);
  const [flyzDestination, setFlyzDestination] = useState({ city: 'Miami', code: 'MIA', price: '$245' });
  const [flyzSearch, setFlyzSearch] = useState<any>(null);
  const [flyzSelectedFlight, setFlyzSelectedFlight] = useState<any>(null);
  const [shieldCheckout, setShieldCheckout] = useState({ quantity: 5, total: 1 });
  const [settingsDetail, setSettingsDetail] = useState<SettingsDetailKey>('language');
  const [qrKind, setQrKind] = useState<'buyer_identity' | 'wallet_receive' | 'vendor_shop'>('buyer_identity');
  const [publicShop, setPublicShop] = useState({ vendorId: '', shopName: '' });
  const [pendingQrToken, setPendingQrToken] = useState<string | null>(null);
  const [qrLaunchToken, setQrLaunchToken] = useState<string | null>(null);
  const [walletQrDisplayToken, setWalletQrDisplayToken] = useState<string | null>(null);
  const [publicBuyerProfile, setPublicBuyerProfile] = useState<any>(null);
  const [momentsTarget, setMomentsTarget] = useState<{userId?:string; name?:string; momentId?:string}>({});
  const [privacyReturnScreen, setPrivacyReturnScreen] = useState<BuyerScreen>('me');
  const [walletQrRecipient, setWalletQrRecipient] = useState<{token:string; recipient:any} | null>(null);
  useEffect(() => { registerBuyerScreen(buyerScreen); }, [buyerScreen, registerBuyerScreen]);
  useEffect(() => {
    if (!authenticated) { setUnreadNotificationsCount(0); setUnreadMessagesCount(0); return; }
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { if (active) setUnreadNotificationsCount(0); return; }
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id).eq('read', false);
      if (!error && active) setUnreadNotificationsCount(count || 0);
      const { data: conversations } = await supabase.from('conversations').select('id').contains('participant_ids', [authData.user.id]);
      if (conversations?.length) {
        const { count: messageCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('conversation_id', conversations.map((conversation: { id: string }) => conversation.id)).is('read_at', null).neq('sender_id', authData.user.id);
        if (active) setUnreadMessagesCount(messageCount || 0);
      } else if (active) setUnreadMessagesCount(0);
    };
    void load();
    channel = supabase.channel('app-notification-count').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { void load(); }).subscribe();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [authenticated]);
  useEffect(() => { registerChallengePress(() => setBuyerScreen('frenziesChallenges')); registerChallengeDismiss(() => setShowChallenge(false)); }, [registerChallengePress, registerChallengeDismiss]);
  const [showChallenge, setShowChallenge] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendorMode, setIsVendorMode] = useState(false);
  useEffect(() => { let mounted = true; const handleUrl = async (url: string | null) => { if (!url || !mounted) return; const parsed = Linking.parse(url); const scheme = (parsed.scheme ?? '').toLowerCase(); const host = (parsed.hostname ?? '').toLowerCase(); const path = (parsed.path ?? '').split('/').filter(Boolean).join('/').toLowerCase(); const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null; const token = typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token : null; if (scheme !== 'wantiss') return; const isQrRoute = host === 'qr' || path === 'qr'; if (isQrRoute) { if (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) { Alert.alert('Wantiss link not recognized', 'This Wantiss QR link is incomplete or invalid.'); return; } setPendingQrToken(token); setAuthInitialMode('buyer'); setScreen('auth'); setAppMode('buyer'); return; } const isResetRoute = host === 'reset-password' || path === 'reset-password'; if (!isResetRoute) return; try { if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) throw error; } if (mounted) setScreen('reset'); } catch (error) { if (mounted) { setScreen('auth'); console.error('Password reset link error:', error); } } }; Linking.getInitialURL().then(handleUrl); const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url)); return () => { mounted = false; subscription.remove(); }; }, []);
  useEffect(() => { if (!authenticated || !pendingQrToken) return; let active = true; const token = pendingQrToken; void (async () => { try { const { data, error } = await supabase.rpc('resolve_qr_identity', { p_token: token }); if (error) throw error; if (!data?.valid) throw new Error('This Wantiss QR is invalid, expired, or revoked.'); if (!active) return; setPendingQrToken(null); if (data.is_self === true) { setQrLaunchToken(token); setQrKind(data.qr_type === 'wallet_receive' ? 'wallet_receive' : 'buyer_identity'); setBuyerScreen('qrIdentity'); setAppMode('buyer'); return; } if (data.destination === 'vendor-shop') { setPublicShop({ vendorId: data.vendor_id, shopName: data.shop_name }); setBuyerScreen('vendorShop'); } else if (data.destination === 'buyer-profile') { setPublicBuyerProfile(data); setBuyerScreen('publicBuyerProfile'); } else if (data.destination === 'wallet-receive' || data.qr_type === 'wallet_receive') { setWalletQrRecipient({ token, recipient: { ...data, destination: 'wallet-receive' } }); setQrLaunchToken(null); setWalletQrDisplayToken(null); setBuyerScreen('walletQrRecipient'); setAppMode('buyer'); } } catch (error) { Alert.alert('QR not recognized', error instanceof Error ? error.message : 'This QR could not be opened.'); } })(); return () => { active = false; }; }, [authenticated, pendingQrToken]);
  if (!fontsLoaded || !authReady) return null;
  if (authenticated && appMode === 'vendor') {
    return <BusinessSpaceScreen onSwitchToBuyer={() => { setAppMode('buyer'); setBuyerScreen('home'); }} onSignOut={async () => { await supabase.auth.signOut(); setAuthenticated(false); setAppMode('buyer'); setScreen('auth'); setBuyerScreen('home'); }} />;
  }
  if (authenticated) {
    try {
      if (buyerScreen === 'messageHub') return <MessageHubScreen onBack={() => setBuyerScreen('home')} onMessagesPress={() => setBuyerScreen('messages')} onNotificationsPress={() => setBuyerScreen('notifications')} unreadMessages={unreadMessagesCount} unreadNotifications={unreadNotificationsCount} />;
      if (buyerScreen === 'notifications') return <NotificationsScreen onBack={() => setBuyerScreen('messageHub')} onNavigate={(target) => setBuyerScreen(target as BuyerScreen)} />;
      if (buyerScreen === 'messages') return <MessagesScreen onBack={() => setBuyerScreen('messageHub')} />;
      if (buyerScreen === 'flyzResults') return <FlyzResultsScreen {...flyzSearch} onBack={() => setBuyerScreen('flyz')} onSelect={(flight) => { setFlyzSelectedFlight(flight); setBuyerScreen('flyzDetails'); }} />;
      if (buyerScreen === 'flyzDetails') return <FlyzDetailsScreen flight={flyzSelectedFlight} onBack={() => setBuyerScreen('flyzResults')} onContinue={() => setBuyerScreen('flyzPassengerDetails')} />;
      if (buyerScreen === 'flyzPassengerDetails') return <FlyzPassengerDetailsScreen onBack={() => setBuyerScreen('flyzDetails')} onContinue={() => setBuyerScreen('flyzPayment')} />;
      if (buyerScreen === 'flyzPayment') return <FlyzPaymentScreen flight={flyzSelectedFlight} onBack={() => setBuyerScreen('flyzPassengerDetails')} />;
      if (buyerScreen === 'flyzDestination') return <FlyzDestinationScreen city={flyzDestination.city} code={flyzDestination.code} price={flyzDestination.price} onBack={() => setBuyerScreen('flyz')} />;
      if (buyerScreen === 'flyzMyTrips') return <FlyzMyTripsScreen onBack={() => setBuyerScreen('flyz')} onHomePress={() => setBuyerScreen('flyz')} onWalletPress={() => setBuyerScreen('wallet')} onDealsPress={() => setBuyerScreen('flyzDeals')} onMorePress={() => {}} />;
      if (buyerScreen === 'flyzDeals') return <FlyzDealsScreen onBack={() => setBuyerScreen('flyz')} onHomePress={() => setBuyerScreen('flyz')} onTripsPress={() => setBuyerScreen('flyzMyTrips')} onMorePress={() => setBuyerScreen('me')} />;
      if (buyerScreen === 'woulib') return <WoulibFlow onExit={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'konsoliss') return <KonsolissHomeScreen onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'goodies') return <GoodiesHomeScreen onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'stayz') return <StayzGuestScreen onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'walletQrRecipient') return walletQrRecipient ? <WalletQRRecipientScreen token={walletQrRecipient.token} recipient={walletQrRecipient.recipient} onBack={() => { setWalletQrRecipient(null); setBuyerScreen('wallet'); }} /> : <AppError title="Wallet recipient unavailable" error="Scan the wallet QR again." />;
      if (buyerScreen === 'profilePrivacy') return <ProfilePrivacyScreen onBack={() => setBuyerScreen(privacyReturnScreen)} />;
      if (buyerScreen === 'flyzMoments') return <FlyzMomentsScreen onBack={() => setBuyerScreen(momentsTarget.userId ? 'publicBuyerProfile' : 'flyz')} profileUserId={momentsTarget.userId} profileName={momentsTarget.name} initialMomentId={momentsTarget.momentId} onPrivacyPress={() => { setPrivacyReturnScreen('flyzMoments'); setBuyerScreen('profilePrivacy'); }} onHomePress={() => setBuyerScreen('flyz')} onDealsPress={() => setBuyerScreen('flyzDeals')} onWalletPress={() => setBuyerScreen('wallet')} onMorePress={() => setBuyerScreen('me')} />;
      if (buyerScreen === 'flyz') return <FlyzHomeScreen onMomentsPress={() => { setMomentsTarget({}); setBuyerScreen('flyzMoments'); }} onBack={() => setBuyerScreen('home')} onWalletPress={() => setBuyerScreen('wallet')} onNotificationsPress={() => setBuyerScreen('notifications')} onMyTripsPress={() => setBuyerScreen('flyzMyTrips')} onDealsPress={() => setBuyerScreen('flyzDeals')} onMorePress={() => {}} onDestinationPress={(city, code, price) => { setFlyzDestination({ city, code, price }); setBuyerScreen('flyzDestination'); }} onSearch={(data) => { setFlyzSearch({ ...data, departDate: data.departDate.toLocaleDateString(), returnDate: data.returnDate?.toLocaleDateString() }); setBuyerScreen('flyzResults'); }} />;
      if (buyerScreen === 'frenziesRpsLobby') return <FrenziesChallengeLayer showChallenge={showChallenge} onPress={() => setBuyerScreen('frenziesChallenges')} onDismiss={() => setShowChallenge(false)}><FrenziesRpsLobbyScreen onBack={() => setBuyerScreen('frenzies')} onDemoPress={() => setBuyerScreen('frenziesDemo')} /></FrenziesChallengeLayer>;
      if (buyerScreen === 'frenziesDemo') return <FrenziesChallengeLayer showChallenge={showChallenge} onPress={() => setBuyerScreen('frenziesChallenges')} onDismiss={() => setShowChallenge(false)}><FrenziesDemoScreen onBack={() => setBuyerScreen('frenziesRpsLobby')} onViewOnlinePlayers={() => setBuyerScreen('frenziesOnlinePlayers')} onPlayRps={() => setBuyerScreen('frenziesRpsGame')} /></FrenziesChallengeLayer>;
      if (buyerScreen === 'frenziesRpsGame') return <FrenziesRpsGameScreen onBack={() => setBuyerScreen('frenziesDemo')} />;
      if (buyerScreen === 'frenziesOnlinePlayers') return <FrenziesChallengeLayer showChallenge={showChallenge} onPress={() => setBuyerScreen('frenziesChallenges')} onDismiss={() => setShowChallenge(false)}><FrenziesOnlinePlayersScreen onBack={() => setBuyerScreen('frenziesDemo')} onChallengesPress={() => setBuyerScreen('frenziesChallenges')} /></FrenziesChallengeLayer>;
      if (buyerScreen === 'frenziesChallenges') return <FrenziesChallengeLayer showChallenge={showChallenge} onPress={() => setBuyerScreen('frenziesChallenges')} onDismiss={() => setShowChallenge(false)}><FrenziesChallengeInboxScreen onBack={() => setBuyerScreen('frenzies')} onAccept={() => setBuyerScreen('frenziesChallengeStatus')} onDecline={() => setShowChallenge(false)} /></FrenziesChallengeLayer>;
      if (buyerScreen === 'frenziesChallengeStatus') return <FrenziesChallengeStatusScreen onBack={() => setBuyerScreen('frenzies')} />;
      if (buyerScreen === 'frenziesChallengeReady') return <FrenziesChallengeStatusScreen ready onBack={() => setBuyerScreen('frenzies')} />;
      if (buyerScreen === 'frenziesRankings') return <FrenziesRankingScreen onBack={() => setBuyerScreen('frenzies')} />;
      if (buyerScreen === 'frenziesStreakShield') return <FrenziesStreakShieldScreen onBack={() => setBuyerScreen('frenzies')} onGetShield={() => setBuyerScreen('frenziesGetStreakShield')} />;
      if (buyerScreen === 'frenziesGetStreakShield') return <FrenziesGetStreakShieldScreen onBack={() => setBuyerScreen('frenziesStreakShield')} onCheckout={(quantity, total) => { setShieldCheckout({ quantity, total }); setBuyerScreen('frenziesShieldCheckout'); }} />;
      if (buyerScreen === 'frenziesShieldCheckout') return <FrenziesStreakShieldCheckoutScreen quantity={shieldCheckout.quantity} total={shieldCheckout.total} onBack={() => setBuyerScreen('frenziesGetStreakShield')} />;
      if (buyerScreen === 'frenzies') return <FrenziesChallengeLayer showChallenge={showChallenge} onPress={() => setBuyerScreen('frenziesChallenges')} onDismiss={() => setShowChallenge(false)}><FrenziesHomeScreen onBack={() => setBuyerScreen('home')} onPlayGame={(gameId) => { if (gameId === 'rps') setBuyerScreen('frenziesRpsLobby'); }} onOpenRankings={() => setBuyerScreen('frenziesRankings')} onOpenStreakShield={() => setBuyerScreen('frenziesStreakShield')} /></FrenziesChallengeLayer>;
      if (buyerScreen === 'vendorShop') return <VendorShopScreen shopName={publicShop.shopName} vendorId={publicShop.vendorId} onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'publicBuyerProfile') return <PublicBuyerProfileScreen profile={publicBuyerProfile ?? {}} onBack={() => setBuyerScreen('home')} onOpenMoments={(userId, name, momentId) => { setMomentsTarget({ userId, name, momentId }); setBuyerScreen('flyzMoments'); }} onPrivacyPress={() => { setPrivacyReturnScreen('publicBuyerProfile'); setBuyerScreen('profilePrivacy'); }} />;
      if (buyerScreen === 'qrIdentity') return <QRIdentityScreen kind={qrKind} initialToken={qrLaunchToken} displayToken={qrKind === 'wallet_receive' ? walletQrDisplayToken : null} onBack={() => { setQrLaunchToken(null); setWalletQrDisplayToken(null); setBuyerScreen(qrKind === 'buyer_identity' ? 'me' : 'wallet'); }} onOpenBuyer={(profile) => { setPublicBuyerProfile(profile ?? {}); setBuyerScreen('publicBuyerProfile'); }} onOpenWallet={(token, recipient) => { setWalletQrDisplayToken(null); setWalletQrRecipient({ token, recipient }); setBuyerScreen('walletQrRecipient'); }} onOpenShop={(vendorId, shopName) => { setPublicShop({ vendorId, shopName }); setBuyerScreen('vendorShop'); }} onPrivacyPress={() => { setPrivacyReturnScreen('qrIdentity'); setBuyerScreen('profilePrivacy'); }} />;
      if (buyerScreen === 'walletAddNewCard') return <WalletAddNewCardScreen onBack={() => setBuyerScreen('walletBankCards')} />;
      if (buyerScreen === 'walletBankCards') return <WalletBankCardsScreen onBack={() => setBuyerScreen('walletPaymentMethods')} onAddCardPress={() => setBuyerScreen('walletAddNewCard')} />;
      if (buyerScreen === 'walletPersonalInfo') return <WalletPersonalInfoScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletPaymentMethods') return <WalletPaymentMethodsScreen onBack={() => setBuyerScreen('walletSettings')} onBankCardPress={() => setBuyerScreen('walletBankCards')} />;
      if (buyerScreen === 'walletRecentActivity') return <WalletRecentActivityScreen onBack={() => setBuyerScreen('wallet')} />;
      if (buyerScreen === 'walletHistory') return <WalletHistoryScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletSettings') return <WalletSettingsScreen onBack={() => setBuyerScreen('wallet')} onHomePress={() => setBuyerScreen('home')} onNotificationsPress={() => setBuyerScreen('walletNotifications')} onNotificationsSettingsPress={() => setBuyerScreen('walletNotificationSettings')} onPersonalInfoPress={() => setBuyerScreen('walletPersonalInfo')} onPaymentMethodsPress={() => setBuyerScreen('walletPaymentMethods')} onHistoryPress={() => setBuyerScreen('walletHistory')} onQRPress={(token) => { setWalletQrDisplayToken(token ?? null); setQrLaunchToken(null); setQrKind('wallet_receive'); setBuyerScreen('qrIdentity'); }} />
      if (buyerScreen === 'walletNotificationSettings') return <WalletNotificationSettingsScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletNotifications') return <WalletNotificationsScreen onBack={() => setBuyerScreen('wallet')} onPayMoneyRequest={(requestId) => { console.info('Pay money request:', requestId); }} />;
      if (buyerScreen === 'wallet') return <WalletHomeScreen onRecentActivityPress={() => setBuyerScreen('walletRecentActivity')} onBack={() => setBuyerScreen('me')} onHomePress={() => setBuyerScreen('home')} onMePress={() => setBuyerScreen('walletSettings')} onNotificationsPress={() => setBuyerScreen('walletNotifications')} onQRPress={() => { setQrKind('wallet_receive'); setBuyerScreen('qrIdentity'); }} />;
      if (buyerScreen === 'settings') return <SettingsScreen
        onBack={() => setBuyerScreen('me')}
        onOpen={(target) => {
          if (target === 'accountSecurity') setBuyerScreen('accountSecurity');
          else if (target === 'addresses') setBuyerScreen('addresses');
          else if (target === 'personalInformation') setBuyerScreen('personalInformation');
          else { setSettingsDetail(target); setBuyerScreen('settingsDetail'); }
        }}
        onSwitchAccount={async (destination: 'vendor' | 'buyer') => {
          if (destination === 'vendor') {
            try {
              const { data: modes, error } = await supabase.rpc('get_my_account_modes');
              if (error) throw error;
              if (modes?.business !== true) {
                Alert.alert('Business Space unavailable', 'This logged-in Wantiss account does not have Business Space access yet. Register B&P 2P for this same email first.');
                return;
              }
              setAppMode('vendor');
              setBuyerScreen('home');
            } catch (error) {
              Alert.alert('Could not open Business Space', error instanceof Error ? error.message : 'Please try again.');
            }
            return;
          }
          const { error } = await supabase.auth.signOut();
          if (error) { Alert.alert('Could not switch account', error.message); return; }
          setAuthenticated(false);
          setAppMode('buyer');
          setAuthInitialMode('buyer');
          setScreen('auth');
          setBuyerScreen('home');
        }}
        onLogOut={async () => { const { error } = await supabase.auth.signOut(); if (error) { Alert.alert('Could not log out', error.message); return; } setAuthenticated(false); setAppMode('buyer'); setScreen('auth'); setBuyerScreen('home'); }}
      />;
      if (buyerScreen === 'accountSecurity') return <AccountSecurityScreen onBack={() => setBuyerScreen('settings')} />;
      if (buyerScreen === 'addresses') return <AddressesScreen onBack={() => setBuyerScreen('settings')} />;
      if (buyerScreen === 'personalInformation') return <PersonalInformationScreen onBack={() => setBuyerScreen('settings')} />;
      if (buyerScreen === 'settingsDetail') return <SettingsDetailScreen screen={settingsDetail} onBack={() => setBuyerScreen('settings')} />;
      if (buyerScreen === 'me') { const MeScreen = require('./src/screens/Main/mainMeScreen').default; return <MeScreen onHomePress={() => setBuyerScreen('home')} onQRPress={() => { setQrLaunchToken(null); setQrKind('buyer_identity'); setBuyerScreen('qrIdentity'); }} onWalletPress={() => setBuyerScreen('wallet')} onSettingsPress={() => setBuyerScreen('settings')} onBusinessSpacePress={handleOpenBusinessSpace} />; }
      const HomeScreen = require('./src/screens/Main/mainHomeScreen').default;
      return <HomeScreen onMessagesPress={() => setBuyerScreen('messageHub')} onMePress={() => setBuyerScreen('me')} onFrenziesPress={() => setBuyerScreen('frenzies')} onFlyzPress={() => setBuyerScreen('flyz')} onKonsolissPress={() => setBuyerScreen('konsoliss')} onGoodiesPress={() => setBuyerScreen('goodies')} onWoulibPress={() => setBuyerScreen('woulib')} onStayzPress={() => setBuyerScreen('stayz')} />;
    } catch (error) { return <AppError title="Home could not load" error={error} />; }
  }
  if (screen === 'forgot') return <ForgotPasswordScreen onBack={() => setScreen('auth')} onSignIn={() => setScreen('auth')} onSendResetLink={async email => { const redirectTo = Linking.createURL('reset-password'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }); if (error) throw error; }} />;
  if (screen === 'reset') return <ResetPasswordScreen onBack={() => setScreen('auth')} onSignIn={() => setScreen('auth')} onUpdatePassword={async password => { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; await supabase.auth.signOut(); setScreen('auth'); }} />;
  return <AuthScreen initialMode={authInitialMode} onSignInPressed={async (email, password, requestedMode) => { const { error } = await withAuthRequestTimeout(supabase.auth.signInWithPassword({ email, password }), 'Signing in'); if (error) throw error; await routeAuthenticatedUser(requestedMode); }} onForgotPasswordPressed={async email => { const redirectTo = Linking.createURL('reset-password'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }); if (error) throw error; }} onForgotPasswordScreenPressed={() => setScreen('forgot')} onSignUpPressed={async (email, password, role, fullName, businessName) => {
    const wantsBusiness = ['vendor', 'business', 'seller', 'merchant'].includes(String(role).trim().toLowerCase());
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'buyer', signup_mode: wantsBusiness ? 'business' : 'buyer', full_name: fullName || null, business_name: businessName || null } },
    });
    if (error) {
      const duplicate = /already registered|already exists|user already registered/i.test(error.message);
      if (!duplicate) throw error;

      // Same email means the same Wantiss identity. Authenticate the existing identity,
      // then explicitly activate only the selected mode using a server-checked RPC.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw new Error('This email already has a Wantiss account. Enter its existing password to register the selected mode, or sign in first.');
      }
      const { error: modeError } = await supabase.rpc('register_my_account_mode', { p_mode: wantsBusiness ? 'business' : 'buyer' });
      if (modeError) throw modeError;
      if (wantsBusiness && businessName.trim()) {
        const { error: applicationError } = await supabase.rpc('submit_business_application', { p_business_name: businessName.trim() });
        if (applicationError) throw applicationError;
      }
      await routeAuthenticatedUser(wantsBusiness ? 'business' : 'buyer');
      return wantsBusiness
        ? 'B&P 2P mode is now registered for your existing Wantiss account. Continue in Business Space to complete the business access steps.'
        : 'Buyer mode is now registered for your existing Wantiss account.';
    }
    if (!data.user) throw new Error('Supabase did not return an account. Please try again.');
    // With email-enumeration protection enabled, Supabase may mask a duplicate email
    // as a user with no identities instead of returning an "already registered" error.
    if (!data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        throw new Error('This email may already have a Wantiss account. Enter its existing password to register the selected mode, or sign in first.');
      }
      const { error: modeError } = await supabase.rpc('register_my_account_mode', { p_mode: wantsBusiness ? 'business' : 'buyer' });
      if (modeError) throw modeError;
      if (wantsBusiness && businessName.trim()) {
        const { error: applicationError } = await supabase.rpc('submit_business_application', { p_business_name: businessName.trim() });
        if (applicationError) throw applicationError;
      }
      await routeAuthenticatedUser(wantsBusiness ? 'business' : 'buyer');
      return wantsBusiness
        ? 'B&P 2P mode is now registered for your existing Wantiss account. Continue in Business Space to complete the business access steps.'
        : 'Buyer mode is now registered for your existing Wantiss account.';
    }
    if (data.session) {
      if (wantsBusiness && businessName.trim()) {
        const { error: applicationError } = await supabase.rpc('submit_business_application', { p_business_name: businessName.trim() });
        if (applicationError) throw applicationError;
      }
      await routeAuthenticatedUser(wantsBusiness ? 'business' : 'buyer');
      return wantsBusiness
        ? 'Your B&P 2P registration is ready. Continue to Business Space to complete the business access steps.'
        : 'Your Buyer registration is ready.';
    }
    return wantsBusiness
      ? 'B&P 2P registration started. Check your email to confirm your account, then sign in with B&P 2P selected.'
      : 'Buyer registration started. Check your email to confirm your account, then sign in with Buyer selected.';
  }} />;
}

export default function App() {
  const [showChallenge, setShowChallenge] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendorMode, setIsVendorMode] = useState(false);
  const challengePress = React.useRef<() => void>(() => {});
  const challengeDismiss = React.useRef<() => void>(() => setShowChallenge(false));
  const registerAuthenticated = React.useCallback((value: boolean) => { setIsAuthenticated(value); }, []);
  const registerVendorMode = React.useCallback((value: boolean) => { setIsVendorMode(value); }, []);
  const registerChallengePress = React.useCallback((fn: () => void) => { challengePress.current = fn; }, []);
  const registerChallengeDismiss = React.useCallback((fn: () => void) => { challengeDismiss.current = fn; }, []);
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>('home');
  const registerBuyerScreen = React.useCallback((value: BuyerScreen) => { setBuyerScreen(value); }, []);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><View style={{ flex: 1 }}><AppContent registerChallengePress={registerChallengePress} registerChallengeDismiss={registerChallengeDismiss} registerAuthenticated={registerAuthenticated} registerVendorMode={registerVendorMode} registerBuyerScreen={registerBuyerScreen} />{isAuthenticated && !isVendorMode && showChallenge && buyerScreen !== 'frenziesChallengeStatus' && buyerScreen !== 'frenziesChallengeReady' && <ChallengePlaceholder count={DEMO_CHALLENGES.length} onPress={() => challengePress.current()} onDismiss={() => { setShowChallenge(false); challengeDismiss.current(); }} />}</View></SafeAreaProvider></GestureHandlerRootView>;
}
