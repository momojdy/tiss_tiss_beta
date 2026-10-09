import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AuthScreen from './src/screens/AuthScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import WalletHomeScreen from './src/screens/WalletHomeScreen';
import WalletNotificationsScreen from './src/screens/WalletNotificationsScreen';
import WalletSettingsScreen from './src/screens/WalletSettingsScreen';
import WalletPaymentMethodsScreen from './src/screens/WalletPaymentMethodsScreen';
import WalletBankCardsScreen from './src/screens/WalletBankCardsScreen';
import WalletAddNewCardScreen from './src/screens/WalletAddNewCardScreen';
import WalletPersonalInfoScreen from './src/screens/WalletPersonalInfoScreen';
import WalletNotificationSettingsScreen from './src/screens/WalletNotificationSettingsScreen';
import WalletHistoryScreen from './src/screens/WalletHistoryScreen';
import WalletRecentActivityScreen from './src/screens/WalletRecentActivityScreen';
import FrenziesHomeScreen from './src/screens/FrenziesHomeScreen';
import KonsolissHomeScreen from './src/screens/KonsolissHomeScreen';
import GoodiesHomeScreen from './src/screens/GoodiesHomeScreen';
import FlyzHomeScreen from './src/screens/FlyzHomeScreen';
import FlyzMyTripsScreen from './src/screens/FlyzMyTripsScreen';
import FlyzDealsScreen from './src/screens/FlyzDealsScreen';
import FlyzDestinationScreen from './src/screens/FlyzDestinationScreen';
import FlyzResultsScreen from './src/screens/FlyzResultsScreen';
import FlyzDetailsScreen from './src/screens/FlyzDetailsScreen';
import FlyzPassengerDetailsScreen from './src/screens/FlyzPassengerDetailsScreen';
import FlyzPaymentScreen from './src/screens/FlyzPaymentScreen';
import FrenziesDemoScreen from './src/screens/FrenziesDemoScreen';
import FrenziesRpsLobbyScreen from './src/screens/FrenziesRpsLobbyScreen';
import FrenziesRpsGameScreen from './src/screens/FrenziesRpsGameScreen';
import FrenziesOnlinePlayersScreen from './src/screens/FrenziesOnlinePlayersScreen';
import FrenziesChallengeInboxScreen, { DEMO_CHALLENGES } from './src/screens/FrenziesChallengeInboxScreen';
import FrenziesChallengeStatusScreen from './src/screens/FrenziesChallengeStatusScreen';
import FrenziesRankingScreen from './src/screens/FrenziesRankingScreen';
import FrenziesStreakShieldScreen from './src/screens/FrenziesStreakShieldScreen';
import FrenziesGetStreakShieldScreen from './src/screens/FrenziesGetStreakShieldScreen';
import FrenziesStreakShieldCheckoutScreen from './src/screens/FrenziesStreakShieldCheckoutScreen';
import { supabase } from './src/lib/supabase';

type Screen = 'auth' | 'forgot' | 'reset';
type BuyerScreen = 'home' | 'me' | 'frenzies' | 'frenziesRpsLobby' | 'frenziesDemo' | 'frenziesRpsGame' | 'frenziesOnlinePlayers' | 'frenziesChallenges' | 'frenziesChallengeStatus' | 'frenziesChallengeReady' | 'frenziesRankings' | 'frenziesStreakShield' | 'frenziesGetStreakShield' | 'frenziesShieldCheckout' | 'wallet' | 'walletNotifications' | 'walletNotificationSettings' | 'walletSettings' | 'walletPersonalInfo' | 'walletPaymentMethods' | 'walletBankCards' | 'walletAddNewCard' | 'walletHistory' | 'flyz' | 'flyzMyTrips' | 'flyzDeals' | 'flyzDestination' | 'flyzResults' | 'flyzDetails' | 'flyzPassengerDetails' | 'flyzPayment' | 'konsoliss' | 'goodies';

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

function AppContent({ registerChallengePress, registerChallengeDismiss, registerAuthenticated, registerBuyerScreen }: { registerChallengePress: (fn: () => void) => void; registerChallengeDismiss: (fn: () => void) => void; registerAuthenticated: (value: boolean) => void; registerBuyerScreen: (value: BuyerScreen) => void }) {
  const [fontsLoaded] = useFonts({ Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'), Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'), Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'), Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf') });
  const [screen, setScreen] = useState<Screen>('auth');
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { registerAuthenticated(authenticated); }, [authenticated, registerAuthenticated]);
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>('home');
  const [flyzDestination, setFlyzDestination] = useState({ city: 'Miami', code: 'MIA', price: '$245' });
  const [flyzSearch, setFlyzSearch] = useState<any>(null);
  const [flyzSelectedFlight, setFlyzSelectedFlight] = useState<any>(null);
  const [shieldCheckout, setShieldCheckout] = useState({ quantity: 5, total: 1 });
  useEffect(() => { registerBuyerScreen(buyerScreen); }, [buyerScreen, registerBuyerScreen]);
  useEffect(() => { registerChallengePress(() => setBuyerScreen('frenziesChallenges')); registerChallengeDismiss(() => setShowChallenge(false)); }, [registerChallengePress, registerChallengeDismiss]);
  const [showChallenge, setShowChallenge] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => { let mounted = true; const handleUrl = async (url: string | null) => { if (!url || !mounted) return; const parsed = Linking.parse(url); const path = parsed.path ?? ''; const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null; if (!path.includes('reset-password') && !code) return; try { if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) throw error; } if (mounted) setScreen('reset'); } catch (error) { if (mounted) { setScreen('auth'); console.error('Password reset link error:', error); } } }; Linking.getInitialURL().then(handleUrl); const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url)); return () => { mounted = false; subscription.remove(); }; }, []);
  if (!fontsLoaded) return null;
  if (authenticated) {
    try {
      if (buyerScreen === 'flyzResults') return <FlyzResultsScreen {...flyzSearch} onBack={() => setBuyerScreen('flyz')} onSelect={(flight) => { setFlyzSelectedFlight(flight); setBuyerScreen('flyzDetails'); }} />;
      if (buyerScreen === 'flyzDetails') return <FlyzDetailsScreen flight={flyzSelectedFlight} onBack={() => setBuyerScreen('flyzResults')} onContinue={() => setBuyerScreen('flyzPassengerDetails')} />;
      if (buyerScreen === 'flyzPassengerDetails') return <FlyzPassengerDetailsScreen onBack={() => setBuyerScreen('flyzDetails')} onContinue={() => setBuyerScreen('flyzPayment')} />;
      if (buyerScreen === 'flyzPayment') return <FlyzPaymentScreen flight={flyzSelectedFlight} onBack={() => setBuyerScreen('flyzPassengerDetails')} />;
      if (buyerScreen === 'flyzDestination') return <FlyzDestinationScreen city={flyzDestination.city} code={flyzDestination.code} price={flyzDestination.price} onBack={() => setBuyerScreen('flyz')} />;
      if (buyerScreen === 'flyzMyTrips') return <FlyzMyTripsScreen onBack={() => setBuyerScreen('flyz')} onHomePress={() => setBuyerScreen('flyz')} onWalletPress={() => setBuyerScreen('wallet')} onDealsPress={() => setBuyerScreen('flyzDeals')} onMorePress={() => {}} />;
      if (buyerScreen === 'flyzDeals') return <FlyzDealsScreen onBack={() => setBuyerScreen('flyz')} onHomePress={() => setBuyerScreen('flyz')} onTripsPress={() => setBuyerScreen('flyzMyTrips')} onMorePress={() => setBuyerScreen('me')} />;
      if (buyerScreen === 'konsoliss') return <KonsolissHomeScreen onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'goodies') return <GoodiesHomeScreen onBack={() => setBuyerScreen('home')} />;
      if (buyerScreen === 'flyz') return <FlyzHomeScreen onBack={() => setBuyerScreen('home')} onWalletPress={() => setBuyerScreen('wallet')} onNotificationsPress={() => {}} onMyTripsPress={() => setBuyerScreen('flyzMyTrips')} onDealsPress={() => setBuyerScreen('flyzDeals')} onMorePress={() => {}} onDestinationPress={(city, code, price) => { setFlyzDestination({ city, code, price }); setBuyerScreen('flyzDestination'); }} onSearch={(data) => { setFlyzSearch({ ...data, departDate: data.departDate.toLocaleDateString(), returnDate: data.returnDate?.toLocaleDateString() }); setBuyerScreen('flyzResults'); }} />;
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
      if (buyerScreen === 'walletAddNewCard') return <WalletAddNewCardScreen onBack={() => setBuyerScreen('walletBankCards')} />;
      if (buyerScreen === 'walletBankCards') return <WalletBankCardsScreen onBack={() => setBuyerScreen('walletPaymentMethods')} onAddCardPress={() => setBuyerScreen('walletAddNewCard')} />;
      if (buyerScreen === 'walletPersonalInfo') return <WalletPersonalInfoScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletPaymentMethods') return <WalletPaymentMethodsScreen onBack={() => setBuyerScreen('walletSettings')} onBankCardPress={() => setBuyerScreen('walletBankCards')} />;
      if (buyerScreen === 'walletRecentActivity') return <WalletRecentActivityScreen onBack={() => setBuyerScreen('wallet')} />;
      if (buyerScreen === 'walletHistory') return <WalletHistoryScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletSettings') return <WalletSettingsScreen onBack={() => setBuyerScreen('wallet')} onHomePress={() => setBuyerScreen('home')} onNotificationsPress={() => setBuyerScreen('walletNotifications')} onNotificationsSettingsPress={() => setBuyerScreen('walletNotificationSettings')} onPersonalInfoPress={() => setBuyerScreen('walletPersonalInfo')} onPaymentMethodsPress={() => setBuyerScreen('walletPaymentMethods')} onHistoryPress={() => setBuyerScreen('walletHistory')} />;
      if (buyerScreen === 'walletNotificationSettings') return <WalletNotificationSettingsScreen onBack={() => setBuyerScreen('walletSettings')} />;
      if (buyerScreen === 'walletNotifications') return <WalletNotificationsScreen onBack={() => setBuyerScreen('wallet')} onPayMoneyRequest={(requestId) => { console.info('Pay money request:', requestId); }} />;
      if (buyerScreen === 'wallet') return <WalletHomeScreen onRecentActivityPress={() => setBuyerScreen('walletRecentActivity')} onBack={() => setBuyerScreen('me')} onHomePress={() => setBuyerScreen('home')} onMePress={() => setBuyerScreen('walletSettings')} onNotificationsPress={() => setBuyerScreen('walletNotifications')} />;
      if (buyerScreen === 'me') { const MeScreen = require('./src/screens/MeScreen').default; return <MeScreen onHomePress={() => setBuyerScreen('home')} onWalletPress={() => setBuyerScreen('wallet')} />; }
      const HomeScreen = require('./src/screens/HomeScreen').default;
      return <HomeScreen onMePress={() => setBuyerScreen('me')} onFrenziesPress={() => setBuyerScreen('frenzies')} onFlyzPress={() => setBuyerScreen('flyz')} onKonsolissPress={() => setBuyerScreen('konsoliss')} onGoodiesPress={() => setBuyerScreen('goodies')} />;
    } catch (error) { return <AppError title="Home could not load" error={error} />; }
  }
  if (screen === 'forgot') return <ForgotPasswordScreen onBack={() => setScreen('auth')} onSignIn={() => setScreen('auth')} onSendResetLink={async email => { const redirectTo = Linking.createURL('reset-password'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }); if (error) throw error; }} />;
  if (screen === 'reset') return <ResetPasswordScreen onBack={() => setScreen('auth')} onSignIn={() => setScreen('auth')} onUpdatePassword={async password => { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; await supabase.auth.signOut(); setScreen('auth'); }} />;
  return <AuthScreen onSignInPressed={async (email, password) => { try { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; if (!data.user) throw new Error('No user returned from Supabase.'); setAuthenticated(true); } catch (error) { console.error('SIGN IN ERROR:', error); } }} onForgotPasswordPressed={async email => { const redirectTo = Linking.createURL('reset-password'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo }); if (error) throw error; }} onForgotPasswordScreenPressed={() => setScreen('forgot')} onSignUpPressed={async (email, password, role, fullName, businessName) => { const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role, full_name: fullName || null, business_name: businessName || null } } }); if (error) { if (error.message.toLowerCase().includes('already registered')) throw new Error('This email is already registered. Please sign in instead.'); throw error; } if (data.session) { if (role === 'buyer') setAuthenticated(true); else { await supabase.auth.signOut(); throw new Error('B&P 2P home is not connected yet.'); } return; } if (data.user && !data.session) throw new Error('This email is already registered. Please sign in instead.'); throw new Error('Unable to create your account. Please try again.'); }} />;
}

export default function App() {
  const [showChallenge, setShowChallenge] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const challengePress = React.useRef<() => void>(() => {});
  const challengeDismiss = React.useRef<() => void>(() => setShowChallenge(false));
  const registerAuthenticated = React.useCallback((value: boolean) => { setIsAuthenticated(value); }, []);
  const registerChallengePress = React.useCallback((fn: () => void) => { challengePress.current = fn; }, []);
  const registerChallengeDismiss = React.useCallback((fn: () => void) => { challengeDismiss.current = fn; }, []);
  const [buyerScreen, setBuyerScreen] = useState<BuyerScreen>('home');
  const registerBuyerScreen = React.useCallback((value: BuyerScreen) => { setBuyerScreen(value); }, []);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><View style={{ flex: 1 }}><AppContent registerChallengePress={registerChallengePress} registerChallengeDismiss={registerChallengeDismiss} registerAuthenticated={registerAuthenticated} registerBuyerScreen={registerBuyerScreen} />{isAuthenticated && showChallenge && buyerScreen !== 'frenziesChallengeStatus' && buyerScreen !== 'frenziesChallengeReady' && <ChallengePlaceholder count={DEMO_CHALLENGES.length} onPress={() => challengePress.current()} onDismiss={() => { setShowChallenge(false); challengeDismiss.current(); }} />}</View></SafeAreaProvider></GestureHandlerRootView>;
}
