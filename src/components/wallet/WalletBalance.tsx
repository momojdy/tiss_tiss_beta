import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFonts, Manrope_600SemiBold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import Svg, { Circle, Path } from 'react-native-svg';

const OLIVE = '#1A2517';
const SAGE = '#ACC8A2';
const SAGE_DARK = '#8FAF84';

const SYMBOLS: Record<string, string> = {
  USD: '$',
  HTG: 'HTG',
  DOP: 'RD$',
};

type RateRow = {
  to_currency: unknown;
  market_rate: unknown;
  created_at: unknown;
  expires_at: unknown;
};

function WalletEye({ open }: { open: boolean }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <Path
            d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
            stroke={SAGE}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3" stroke={SAGE} strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path
            d="M3 3l18 18"
            stroke={SAGE}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path
            d="M10.6 10.6c-.5.4-.8.9-.8 1.4 0 1.7 1.3 3 2.9 3 .8 0 1.6-.3 2.1-.9"
            stroke={SAGE}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 6.7C4 8.3 2 12 2 12s4 7 11 7c1.9 0 3.6-.5 5.1-1.3M17.6 17.6C19.9 16 22 12 22 12s-1.4-2.5-3.9-4.4"
            stroke={SAGE}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </Svg>
  );
}

export default function WalletBalance() {
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wantissNumber, setWantissNumber] = useState<string | null>(null);
  const [usdBalance, setUsdBalance] = useState(0);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manropeSemiLoaded] = useFonts({ Manrope_600SemiBold });
  const [manropeExtraLoaded] = useFonts({ Manrope_800ExtraBold });

  const loadWalletData = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      setErrorMessage(null);
    }

    try {
      const user = (await supabase.auth.getUser()).data.user;

      if (!user) {
        setIsLoading(false);
        setErrorMessage('Sign in to view your wallet.');
        return;
      }

      const [{ data: walletRow, error: walletError }, { data: profileRow }, { data: rateRows, error: ratesError }] =
        await Promise.all([
          supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('wantiss_number').eq('id', user.id).maybeSingle(),
          supabase
            .from('exchange_rates')
            .select('to_currency, market_rate, created_at, expires_at')
            .eq('from_currency', 'USD')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false }),
        ]);

      if (walletError) throw walletError;
      if (ratesError) throw ratesError;

      if (!walletRow) {
        setIsLoading(false);
        setErrorMessage('No wallet found for this account.');
        return;
      }

      const balanceValue = walletRow.balance;
      if (typeof balanceValue !== 'number' && typeof balanceValue !== 'string') {
        throw new Error('Wallet balance is not numeric.');
      }

      const fetchedRates: Record<string, number> = { USD: 1 };
      for (const row of ((rateRows ?? []) as RateRow[])) {
        const currency = row.to_currency;
        const marketRate = row.market_rate;

        if (
          typeof currency === 'string' &&
          typeof marketRate === 'number' &&
          marketRate > 0 &&
          fetchedRates[currency] === undefined
        ) {
          fetchedRates[currency] = marketRate;
        }
      }

      setUsdBalance(Number(balanceValue));
      setWantissNumber(
        typeof profileRow?.wantiss_number === 'string'
          ? profileRow.wantiss_number
          : null,
      );
      setRates(fetchedRates);
      setSelectedCurrency(current => (fetchedRates[current] ? current : 'USD'));
      setIsLoading(false);
      setErrorMessage(null);
    } catch {
      setIsLoading(false);
      setErrorMessage('Could not load wallet. Tap to retry.');
    }
  };

  useEffect(() => {
    loadWalletData();

    const userId = supabase.auth.getUser().then(({ data }) => data.user?.id);
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    userId.then(id => {
      if (!id || !active) return;

      channel = supabase
        .channel(`wallet-balance-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${id}`,
          },
          () => loadWalletData(false),
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const currencies = useMemo(
    () =>
      Object.keys(rates).sort((a, b) =>
        a === 'USD' ? -1 : b === 'USD' ? 1 : a.localeCompare(b),
      ),
    [rates],
  );

  const displayedBalance = usdBalance * (rates[selectedCurrency] ?? 1);
  const formattedBalance = displayedBalance.toFixed(2);
  const symbol = SYMBOLS[selectedCurrency];
  const formattedWithSymbol = symbol
    ? `${symbol}${formattedBalance}`
    : `${formattedBalance} ${selectedCurrency}`;

  const maskedWantissNumber = (() => {
    const digits = wantissNumber?.replace(/\\D/g, '');
    if (!digits || digits.length < 4) return '•••• •••• •••• ••••';
    return `•••• •••• •••• ${digits.slice(-4)}`;
  })();

  return (
    <Pressable
      disabled={!errorMessage}
      onPress={() => loadWalletData()}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.balanceColumn}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, manropeSemiLoaded && styles.manropeSemi]}>
              Wantiss Crédité
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => setShowBalance(value => !value)}
            >
              <View style={styles.eye}>
                <WalletEye open={showBalance} />
              </View>
            </Pressable>
          </View>

          <View style={styles.amountRow}>
            <View style={styles.amountWrap}>
              {isLoading ? (
                <Text style={[styles.balanceText, manropeExtraLoaded && styles.manropeExtra]}>
                  ···
                </Text>
              ) : errorMessage ? (
                <Text style={[styles.balanceText, manropeExtraLoaded && styles.manropeExtra]}>
                  —
                </Text>
              ) : (
                <Text style={[styles.balanceText, manropeExtraLoaded && styles.manropeExtra]}>
                  {showBalance ? formattedWithSymbol : '••••••'}
                </Text>
              )}
            </View>

            {!errorMessage && currencies.length > 0 && (
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={styles.currencyPill}
              >
                <Text style={[styles.currencyText, manropeSemiLoaded && styles.manropeSemi]}>
                  {selectedCurrency}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            )}
          </View>
        </View>

        <LinearGradient
          colors={[SAGE, SAGE_DARK]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.chip}
        >
          <View style={styles.chipInner} />
        </LinearGradient>
      </View>

      {errorMessage ? (
        <View style={styles.errorRow}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <Text style={[styles.errorText, manropeSemiLoaded && styles.manropeSemi]}>
            {errorMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, manropeSemiLoaded && styles.manropeSemi]}>
            {maskedWantissNumber}
          </Text>
          <Text style={[styles.footerText, manropeSemiLoaded && styles.manropeSemi]}>
            WANTISS
          </Text>
        </View>
      )}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.dropdown}>
            {currencies.map(currency => (
              <Pressable
                key={currency}
                onPress={() => {
                  setSelectedCurrency(currency);
                  setPickerOpen(false);
                }}
                style={[
                  styles.dropdownItem,
                  currency === selectedCurrency && styles.dropdownItemSelected,
                ]}
              >
                <Text style={[styles.dropdownText, manropeSemiLoaded && styles.manropeSemi]}>
                  {currency}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: OLIVE,
    borderRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balanceColumn: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: SAGE,
    fontSize: 12,
    fontWeight: '600',
  },
  manropeSemi: {
    fontFamily: 'Manrope_600SemiBold',
  },
  manropeExtra: {
    fontFamily: 'Manrope_800ExtraBold',
  },
  eye: {
    width: 15,
    height: 15,
    marginLeft: 8,
    opacity: 0.85,
  },
  amountRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountWrap: {
    flexShrink: 1,
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  currencyPill: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(172, 200, 162, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 4,
    color: SAGE,
    fontSize: 16,
    lineHeight: 14,
  },
  chip: {
    width: 34,
    height: 26,
    borderRadius: 6,
    padding: 5,
  },
  chipInner: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(26, 37, 23, 0.12)',
  },
  footerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: SAGE,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  errorRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    color: 'rgba(172, 200, 162, 0.8)',
    fontSize: 13,
    marginRight: 5,
  },
  errorText: {
    flex: 1,
    color: 'rgba(172, 200, 162, 0.85)',
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  dropdown: {
    backgroundColor: OLIVE,
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(172, 200, 162, 0.18)',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
