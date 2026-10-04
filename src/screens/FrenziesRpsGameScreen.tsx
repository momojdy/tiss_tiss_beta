import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

type Move = 'rock' | 'paper' | 'scissors';
type Result = 'win' | 'loss' | 'tie';

const MOVES: { id: Move; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'rock', label: 'Rock', icon: 'hand-back-right' },
  { id: 'paper', label: 'Paper', icon: 'hand-back-right-outline' },
  { id: 'scissors', label: 'Scissors', icon: 'content-cut' },
];

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family,
  fontSize: size,
  lineHeight: size * 1.22,
  color,
  includeFontPadding: false,
});

function computerMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)].id;
}

function resultFor(player: Move, opponent: Move): Result {
  if (player === opponent) return 'tie';
  if (
    (player === 'rock' && opponent === 'scissors') ||
    (player === 'paper' && opponent === 'rock') ||
    (player === 'scissors' && opponent === 'paper')
  ) return 'win';
  return 'loss';
}

const HAND_ASSETS: Record<Move, string> = {
  rock: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rock-paper-scissors_(rock).png?width=600',
  paper: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rock-paper-scissors_(paper).png?width=600',
  scissors: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rock-paper-scissors_(scissors).png?width=600',
};

function Hand3D({ move, flip = false, animatedValue }: {
  move: Move | null;
  flip?: boolean;
  reveal?: boolean;
  animatedValue: Animated.Value;
}) {
  const scale = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.035] });
  const rotate = animatedValue.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1deg'] });

  if (!move) {
    return (
      <Animated.View style={[s.realHandPlaceholder, { transform: [{ scale }, { rotate }] }]}>
        <View style={s.placeholderRing} />
        <Text style={[tx(10, fonts.semibold, colors.textSecondary)]}>Choose a move</Text>
      </Animated.View>
    );
  }

  const source = { uri: HAND_ASSETS[move] };
  const transforms = [
    { scale },
    { rotate },
    { rotateX: flip ? '180deg' : '0deg' },
  ];

  return (
    <Animated.View style={[s.realHand, { transform: transforms }]}>
      <Image source={source} resizeMode="contain" style={s.realHandImage} />
      <Image
        source={source}
        resizeMode="contain"
        style={[s.realHandImage, s.realHandTint]}
      />
    </Animated.View>
  );
}

function ChoiceCard({ move, onPress, selected, disabled }: {
  move: typeof MOVES[number];
  onPress: () => void;
  selected: boolean;
  disabled: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.choiceCard,
        selected && s.choiceSelected,
        pressed && !disabled && s.choicePressed,
        disabled && !selected && s.choiceDisabled,
      ]}
    >
      <MaterialCommunityIcons name={move.icon} size={27} color={colors.textPrimary} />
      <Text style={[tx(11, fonts.semibold), { marginTop: 6 }]}>{move.label}</Text>
    </Pressable>
  );
}

export default function FrenziesRpsGameScreen({ onBack }: { onBack?: () => void }) {
  const [seconds, setSeconds] = useState(90);
  const [selected, setSelected] = useState<Move | null>(null);
  const [opponent, setOpponent] = useState<Move | null>(null);
  const [phase, setPhase] = useState<'choosing' | 'thinking' | 'revealing' | 'finished'>('choosing');
  const [result, setResult] = useState<Result | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [message, setMessage] = useState('Choose your move');
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1050, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1050, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    return () => { pulse.stopAnimation(); };
  }, [pulse]);

  useEffect(() => {
    if (phase !== 'choosing') return;
    timerRef.current = setInterval(() => {
      setSeconds(v => Math.max(0, v - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (seconds !== 0 || phase !== 'choosing') return;
    // Computer mode never forfeits. It chooses instead.
    makeComputerChoice();
  }, [seconds, phase]);

  const timerLabel = useMemo(() => {
    const min = Math.floor(seconds / 60);
    const sec = String(seconds % 60).padStart(2, '0');
    return min + ':' + sec;
  }, [seconds]);

  const makeComputerChoice = () => {
    if (phase !== 'choosing') return;
    const cpu = computerMove();
    setOpponent(cpu);
    if (!selected) {
      setPhase('revealing');
      setMessage('Time expired');
      Animated.sequence([
        Animated.timing(reveal, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(650),
      ]).start(() => {
        setResult('loss');
        setPhase('finished');
        setMessage('You lost');
        setShowOutcome(true);
      });
      return;
    }
    setPhase('revealing');
    setMessage('Both moves locked');
    Animated.sequence([
      Animated.timing(reveal, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(650),
    ]).start(() => {
      const r = resultFor(selected, cpu);
      setResult(r);
      setPhase('finished');
      setMessage(r === 'win' ? 'You win' : r === 'loss' ? 'You lost' : 'Tie');
      setShowOutcome(true);
    });
  };

  const choose = (move: Move) => {
    if (phase !== 'choosing') return;
    setSelected(move);
    setPhase('thinking');
    setMessage('Your move is locked');
    const delay = 850 + Math.floor(Math.random() * 850);
    setTimeout(() => {
      const cpu = computerMove();
      setOpponent(cpu);
      setPhase('revealing');
      setMessage('Reveal');
      Animated.sequence([
        Animated.timing(reveal, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.delay(700),
      ]).start(() => {
        const r = resultFor(move, cpu);
        setResult(r);
        setPhase('finished');
        setMessage(r === 'win' ? 'You win' : r === 'loss' ? 'You lost' : 'Tie');
        setShowOutcome(true);
      });
    }, delay);
  };

  const reset = () => {
    setSeconds(90);
    setSelected(null);
    setOpponent(null);
    setResult(null);
    setPhase('choosing');
    setMessage('Choose your move');
    setShowOutcome(false);
    reveal.setValue(0);
  };

  const resultCopy = result === 'win' ? 'You won the round.' : result === 'loss' ? 'You lost the round.' : 'It was a tie.';
  const timerUrgent = seconds <= 15;

  return (
    <View style={s.safe}>
      <FrenziesHeader title="Rock Paper Scissors" onBack={onBack} showPoints={false} />

      <View style={s.content}>
        <View style={s.matchTop}>
          <View>
            <Text style={tx(11, fonts.semibold, colors.textSecondary)}>DEMO MATCH</Text>
            <Text style={[tx(21, fonts.bold), { marginTop: 4 }]}>Rock Paper Scissors</Text>
          </View>
          <View style={s.virtualPill}>
            <MaterialCommunityIcons name="gamepad-variant-outline" size={14} color={colors.textPrimary} />
            <Text style={[tx(10, fonts.bold), { marginLeft: 5 }]}>Virtual only</Text>
          </View>
        </View>

        <View style={s.arena}>
          <View style={s.playerHeader}>
            <View style={s.nameBlock}>
              <View style={s.avatar}><MaterialCommunityIcons name="robot-outline" size={18} color={colors.textPrimary} /></View>
              <View style={{ marginLeft: 9 }}>
                <Text style={tx(13, fonts.bold)}>Computer</Text>
                <Text style={[tx(10, fonts.regular, colors.textSecondary), { marginTop: 2 }]}>Always chooses</Text>
              </View>
            </View>
            <View style={s.waitingPill}>
              <View style={[s.liveDot, timerUrgent && s.liveDotUrgent]} />
              <Text style={tx(11, fonts.bold, timerUrgent ? '#B44B2E' : colors.textPrimary)}>{phase === 'finished' ? 'DONE' : timerLabel}</Text>
            </View>
          </View>

          <View style={s.handZoneTop}>
            <Hand3D move={opponent} flip animatedValue={pulse} />
          </View>

          <View style={s.battleLine}>
            <View style={s.line} />
            <View style={s.vsCircle}><Text style={tx(10, fonts.bold, colors.textSecondary)}>VS</Text></View>
            <View style={s.line} />
          </View>

          <View style={s.handZoneBottom}>
            <Hand3D move={selected} animatedValue={pulse} />
          </View>

          <View style={s.playerFooter}>
            <View style={s.nameBlock}>
              <View style={s.avatar}><Text style={tx(13, fonts.bold)}>Y</Text></View>
              <View style={{ marginLeft: 9 }}>
                <Text style={tx(13, fonts.bold)}>You</Text>
                <Text style={[tx(10, fonts.regular, colors.textSecondary), { marginTop: 2 }]}>
                  {selected ? 'Move locked' : 'Make your choice'}
                </Text>
              </View>
            </View>
            <Text style={[tx(11, fonts.semibold, timerUrgent ? '#B44B2E' : colors.textSecondary)]}>{message}</Text>
          </View>
        </View>

        <View style={s.choiceArea}>
          <Text style={[tx(13, fonts.semibold), { textAlign: 'center' }]}>
            {phase === 'choosing' ? 'Choose your move' : phase === 'thinking' ? 'Waiting for the computer…' : 'The hands reveal the result'}
          </Text>
          <View style={s.choices}>
            {MOVES.map(move => (
              <ChoiceCard
                key={move.id}
                move={move}
                selected={selected === move.id}
                disabled={phase !== 'choosing'}
                onPress={() => choose(move.id)}
              />
            ))}
          </View>
        </View>

        <View style={s.ruleNote}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
          <Text style={[tx(10.5, fonts.regular, colors.textSecondary), { flex: 1, marginLeft: 8, lineHeight: 15 }]}>
            You have 90 seconds to choose. The computer always makes a move; if you time out, you lose by forfeit.
          </Text>
        </View>
      </View>

      {showOutcome && (
        <View style={s.overlay}>
          <View style={s.outcomeCard}>
            <View style={[s.outcomeIcon, result === 'win' ? s.winBg : result === 'loss' ? s.lossBg : s.tieBg]}>
              <MaterialIcons
                name={result === 'win' ? 'emoji-events' : result === 'loss' ? 'close' : 'remove'}
                size={29}
                color={colors.textPrimary}
              />
            </View>
            <Text style={[tx(25, fonts.bold), { marginTop: 13 }]}>{result === 'win' ? 'YOU WIN' : result === 'loss' ? 'YOU LOST' : 'TIE'}</Text>
            <Text style={[tx(12, fonts.regular, colors.textSecondary), { marginTop: 6, textAlign: 'center' }]}>
              {resultCopy}
            </Text>
            <View style={s.resultMoves}>
              <View style={s.resultMove}>
                <Text style={tx(10, fonts.semibold, colors.textSecondary)}>YOU</Text>
                {selected && <MaterialCommunityIcons name={MOVES.find(m => m.id === selected)!.icon} size={30} color={colors.textPrimary} />}
                <Text style={[tx(10, fonts.semibold), { marginTop: 4 }]}>{selected}</Text>
              </View>
              <Text style={[tx(11, fonts.bold, colors.textSecondary), { alignSelf: 'center' }]}>VS</Text>
              <View style={s.resultMove}>
                <Text style={tx(10, fonts.semibold, colors.textSecondary)}>COMPUTER</Text>
                {opponent && <MaterialCommunityIcons name={MOVES.find(m => m.id === opponent)!.icon} size={30} color={colors.textPrimary} />}
                <Text style={[tx(10, fonts.semibold), { marginTop: 4 }]}>{opponent}</Text>
              </View>
            </View>
            <Pressable onPress={reset} style={s.primaryAction}>
              <Text style={tx(12, fonts.bold)}>Play again</Text>
            </Pressable>
            <Pressable onPress={onBack} style={s.secondaryAction}>
              <Text style={tx(12, fonts.bold)}>Back to demo</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 22 },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  virtualPill: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  arena: { marginTop: 14, borderRadius: 22, backgroundColor: '#F4F7F1', padding: 15, overflow: 'hidden' },
  playerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  nameBlock: { flexDirection: 'row', alignItems: 'center', minWidth: 150 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCE8D2', alignItems: 'center', justifyContent: 'center' },
  waitingPill: { height: 31, minWidth: 61, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78936C', marginRight: 6 },
  liveDotUrgent: { backgroundColor: '#D96A3C' },
  handZoneTop: { height: 125, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  handZoneBottom: { height: 125, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  realHand: { width: 178, height: 150, alignItems: 'center', justifyContent: 'center' },
  realHandImage: { position: 'absolute', width: 178, height: 150 },
  realHandTint: { tintColor: '#6B3F2A', opacity: 0.18 },
  realHandPlaceholder: { width: 178, height: 150, alignItems: 'center', justifyContent: 'center' },
  placeholderRing: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: '#D9E1D4', backgroundColor: '#FFFFFF' },
  battleLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: '#DDE3D9' },
  vsCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginHorizontal: 9 },
  choiceArea: { marginTop: 16 },
  choices: { flexDirection: 'row', gap: 9, marginTop: 10 },
  choiceCard: { flex: 1, minHeight: 78, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7EAE5', alignItems: 'center', justifyContent: 'center' },
  choiceSelected: { backgroundColor: '#E7F3D8', borderColor: '#B6C99F' },
  choicePressed: { backgroundColor: '#F4F8EF' },
  choiceDisabled: { opacity: 0.58 },
  ruleNote: { marginTop: 'auto', paddingTop: 14, flexDirection: 'row', alignItems: 'flex-start' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,25,19,0.32)', alignItems: 'center', justifyContent: 'center', padding: 26, zIndex: 20 },
  outcomeCard: { width: '100%', maxWidth: 360, borderRadius: 24, backgroundColor: colors.white, padding: 24, alignItems: 'center' },
  outcomeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  winBg: { backgroundColor: '#DCE8D2' },
  lossBg: { backgroundColor: '#F6C8B5' },
  tieBg: { backgroundColor: '#E4E7EA' },
  resultMoves: { width: '100%', marginTop: 18, padding: 13, borderRadius: 16, backgroundColor: '#F7F8F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  resultMove: { alignItems: 'center', minWidth: 90 },
  primaryAction: { width: '100%', height: 45, borderRadius: 13, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  secondaryAction: { width: '100%', height: 45, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderWidth: 1, borderColor: '#DCE8D2' },
});
