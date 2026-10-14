import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

type Move = 'rock' | 'paper' | 'scissors';
type Result = 'win' | 'loss' | 'tie';
type Phase = 'choosing' | 'thinking' | 'revealing' | 'finished';

const MOVES: { id: Move; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'rock', label: 'Rock', icon: 'hand-back-right' },
  { id: 'paper', label: 'Paper', icon: 'hand-back-right-outline' },
  { id: 'scissors', label: 'Scissors', icon: 'content-cut' },
];

const labelOf = (m: Move | null) => m ? MOVES.find(x => x.id === m)!.label : 'No move';
const iconOf = (m: Move) => MOVES.find(x => x.id === m)!.icon;

const SKIN_LIGHT = '#D69A73';
const SKIN_MID = '#B8754F';
const SKIN_DARK = '#8A4F35';
const SKIN_LINE = '#5A3021';

const resultFor = (player: Move, opponent: Move): Result => {
  if (player === opponent) return 'tie';
  if ((player === 'rock' && opponent === 'scissors') || (player === 'paper' && opponent === 'rock') || (player === 'scissors' && opponent === 'paper')) return 'win';
  return 'loss';
};

const randomMove = (): Move => MOVES[Math.floor(Math.random() * MOVES.length)].id;

function Finger({ x, y, w, h, r = 10, rotate = 0, nail = false }: { x: number; y: number; w: number; h: number; r?: number; rotate?: number; nail?: boolean }) {
  return (
    <G transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}>
      <Rect x={x} y={y} width={w} height={h} rx={r} fill="url(#skin)" stroke={SKIN_LINE} strokeWidth={1.6} />
      {nail && <Rect x={x + 3} y={y + 3} width={w - 6} height={Math.max(8, h * 0.2)} rx={5} fill="#E9B89A" opacity={0.8} />}
    </G>
  );
}

function HandArt({ move, width = 120, height = 150 }: { move: Move | null; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 150">
      <Defs>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={SKIN_LIGHT} />
          <Stop offset="0.58" stopColor={SKIN_MID} />
          <Stop offset="1" stopColor={SKIN_DARK} />
        </LinearGradient>
        <LinearGradient id="palm" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#D99D77" />
          <Stop offset="1" stopColor="#7D452F" />
        </LinearGradient>
      </Defs>
      <Rect x="43" y="119" width="34" height="31" rx="7" fill="url(#skin)" stroke={SKIN_LINE} strokeWidth="1.6" />
      {move === 'paper' ? (
        <>
          <Finger x={27} y={20} w={17} h={79} r={8} nail />
          <Finger x={45} y={9} w={18} h={91} r={9} nail />
          <Finger x={64} y={15} w={18} h={86} r={9} nail />
          <Finger x={83} y={29} w={17} h={72} r={8} nail />
          <Path d="M31 91 C36 75 46 69 57 71 C67 65 82 69 89 79 L91 103 C82 119 63 124 47 117 C36 112 29 102 31 91Z" fill="url(#palm)" stroke={SKIN_LINE} strokeWidth="1.8" />
          <Ellipse cx="64" cy="93" rx="20" ry="13" fill="#E4B08E" opacity={0.22} />
        </>
      ) : move === 'scissors' ? (
        <>
          <Finger x={41} y={25} w={18} h={69} r={9} rotate={-25} nail />
          <Finger x={60} y={18} w={18} h={74} r={9} rotate={25} nail />
          <Finger x={29} y={62} w={18} h={42} r={9} rotate={-10} />
          <Finger x={75} y={62} w={18} h={42} r={9} rotate={10} />
          <Path d="M35 93 C38 76 48 67 60 68 C72 67 84 75 88 91 L82 110 C69 122 49 121 38 110Z" fill="url(#palm)" stroke={SKIN_LINE} strokeWidth="1.8" />
          <Ellipse cx="61" cy="91" rx="19" ry="12" fill="#E4B08E" opacity={0.2} />
        </>
      ) : (
        <>
          <Finger x={31} y={57} w={18} h={47} r={9} rotate={-8} />
          <Finger x={45} y={49} w={18} h={50} r={9} rotate={-2} />
          <Finger x={59} y={48} w={18} h={51} r={9} rotate={4} />
          <Finger x={73} y={55} w={18} h={47} r={9} rotate={10} />
          <Finger x={20} y={80} w={45} h={20} r={10} rotate={-28} />
          <Path d="M34 78 C39 58 50 50 65 53 C81 55 91 68 88 88 C85 108 70 119 53 117 C38 115 28 100 34 78Z" fill="url(#palm)" stroke={SKIN_LINE} strokeWidth="1.8" />
          <Ellipse cx="60" cy="84" rx="20" ry="14" fill="#E4B08E" opacity={0.2} />
        </>
      )}
    </Svg>
  );
}

function Hand({ move, uid, top, handH, dist, pulse, approach, shake, pop }: { move: Move | null; uid: string; top: boolean; handH: number; dist: number; pulse: Animated.Value; approach: Animated.Value; shake: Animated.Value; pop: Animated.Value }) {
  const idle = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, top ? -3 : 3] });
  const travel = approach.interpolate({ inputRange: [0, 1], outputRange: [0, top ? dist : -dist] });
  const wiggle = shake.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, top ? 3 : -3, 0] });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View style={{ height: handH, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: Animated.add(idle, travel) }, { translateX: wiggle }, { scale }, { rotate: top ? '180deg' : '0deg' }] }}>
      <HandArt key={uid} move={move} width={Math.min(120, handH * 0.82)} height={Math.min(150, handH)} />
    </Animated.View>
  );
}

export default function FrenziesRpsGameScreen({ onBack }: { onBack?: () => void }) {
  const { height } = useWindowDimensions();
  const handH = Math.max(96, Math.min(150, (height - 500) / 2));
  const dist = handH * 0.3;
  const [seconds, setSeconds] = useState(90);
  const [selected, setSelected] = useState<Move | null>(null);
  const [opponent, setOpponent] = useState<Move | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState<Phase>('choosing');
  const [result, setResult] = useState<Result | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [message, setMessage] = useState('Choose your move');
  const pulse = useRef(new Animated.Value(0)).current;
  const approach = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const lockedRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => {
      mountedRef.current = false;
      loop.stop();
      clearTimers();
    };
  }, [clearTimers, pulse]);

  useEffect(() => {
    if (phase !== 'choosing') return;
    const id = setInterval(() => setSeconds(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = useCallback((player: Move | null, cpu: Move, forfeit = false) => {
    if (!mountedRef.current) return;
    const r: Result = forfeit ? 'loss' : resultFor(player!, cpu);
    setResult(r);
    setPhase('finished');
    setMessage(forfeit ? 'Time expired — you forfeit the round' : r === 'win' ? 'You win' : r === 'loss' ? 'You lost' : 'Tie');
    const id = setTimeout(() => mountedRef.current && setShowOutcome(true), 700);
    timeoutsRef.current.push(id);
  }, []);

  const startReveal = useCallback((player: Move, cpu: Move, forfeit = false) => {
    setPhase('revealing');
    setMessage('Reveal');
    Animated.timing(approach, { toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const shakes = Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]);
    shakes.start(() => {
      if (!mountedRef.current) return;
      setRevealed(true);
      Animated.timing(pop, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      finish(player, cpu, forfeit);
    });
  }, [approach, finish, pop, shake]);

  useEffect(() => {
    if (seconds !== 0 || phase !== 'choosing' || lockedRef.current) return;
    lockedRef.current = true;
    setTimedOut(true);
    const cpu = randomMove();
    setOpponent(cpu);
    startReveal(selected ?? 'rock', cpu, !selected);
  }, [seconds, phase, selected, startReveal]);

  const choose = (move: Move) => {
    if (phase !== 'choosing' || lockedRef.current) return;
    lockedRef.current = true;
    setSelected(move);
    setMessage('Move locked — waiting for the computer');
    setPhase('thinking');
    const delay = 850 + Math.floor(Math.random() * 850);
    const id = setTimeout(() => {
      if (!mountedRef.current) return;
      const cpu = randomMove();
      setOpponent(cpu);
      startReveal(move, cpu);
    }, delay);
    timeoutsRef.current.push(id);
  };

  const reset = () => {
    clearTimers();
    pulse.stopAnimation();
    approach.stopAnimation();
    shake.stopAnimation();
    pop.stopAnimation();
    pulse.setValue(0);
    approach.setValue(0);
    shake.setValue(0);
    pop.setValue(0);
    lockedRef.current = false;
    setSeconds(90);
    setSelected(null);
    setOpponent(null);
    setRevealed(false);
    setTimedOut(false);
    setResult(null);
    setShowOutcome(false);
    setPhase('choosing');
    setMessage('Choose your move');
  };

  const timerLabel = useMemo(() => `0:${String(seconds).padStart(2, '0')}`, [seconds]);
  const urgent = seconds < 15;

  return (
    <View style={s.safe}>
      <FrenziesHeader title="Frenzies" onBack={onBack} showPoints={false} demo />
      <View style={s.content}>
        <View style={s.topRow}>
          <Text style={[s.demoLabel]}>DEMO MATCH</Text>
          <View style={s.virtualPill}><MaterialCommunityIcons name="gamepad-variant-outline" size={14} color={colors.textPrimary} /><Text style={s.virtualText}>Virtual only</Text></View>
        </View>

        <View style={s.arena}>
          <View style={s.playerRow}>
            <View style={s.identity}><View style={s.avatar}><MaterialCommunityIcons name="robot-outline" size={19} color={colors.textPrimary} /></View><View><Text style={s.name}>Computer</Text><Text style={s.sub}>Always chooses</Text></View></View>
            <View style={s.timer}><View style={[s.dot, urgent && s.dotUrgent]} /><Text style={[s.timerText, urgent && s.urgentText]}>{phase === 'finished' ? 'DONE' : timerLabel}</Text></View>
          </View>

          <View style={s.handZone}><Hand move={revealed ? opponent : null} uid="computer" top handH={handH} dist={dist} pulse={pulse} approach={approach} shake={shake} pop={pop} /></View>
          <View style={s.vs}><View style={s.rule} /><View style={s.vsCircle}><Text style={s.vsText}>VS</Text></View><View style={s.rule} /></View>
          <View style={s.handZone}><Hand move={revealed ? selected : null} uid="player" top={false} handH={handH} dist={dist} pulse={pulse} approach={approach} shake={shake} pop={pop} /></View>

          <View style={s.playerRow}>
            <View style={s.identity}><View style={s.avatar}><Text style={s.avatarText}>Y</Text></View><View><Text style={s.name}>You</Text><Text style={s.sub}>{selected ? 'Move locked' : 'Make your choice'}</Text></View></View>
            <Text style={s.status}>{message}</Text>
          </View>
        </View>

        <View style={s.choicesTitle}><Text style={s.chooseTitle}>{phase === 'choosing' ? 'Choose your move' : phase === 'thinking' ? 'Waiting for the computer…' : 'Hands are revealing'}</Text></View>
        <View style={s.choices}>
          {MOVES.map(move => (
            <Pressable key={move.id} disabled={phase !== 'choosing'} onPress={() => choose(move.id)} style={({ pressed }) => [s.choice, selected === move.id && s.choiceSelected, pressed && phase === 'choosing' && s.choicePressed, phase !== 'choosing' && selected !== move.id && s.choiceDisabled]}>
              <MaterialCommunityIcons name={move.icon} size={27} color={colors.textPrimary} />
              <Text style={s.choiceText}>{move.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.note}><MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} /><Text style={s.noteText}>You have 90 seconds to choose. The computer always makes a move; if you time out, you lose by forfeit. Demo money is virtual only.</Text></View>
      </View>

      {showOutcome && (
        <View style={s.overlay}>
          <View style={s.outcome}>
            <View style={[s.outcomeIcon, result === 'win' ? s.win : result === 'loss' ? s.loss : s.tie]}><MaterialIcons name={result === 'win' ? 'emoji-events' : result === 'loss' ? 'close' : 'remove'} size={29} color={colors.textPrimary} /></View>
            <Text style={s.outcomeTitle}>{result === 'win' ? 'YOU WIN' : result === 'loss' ? 'YOU LOST' : 'TIE'}</Text>
            <Text style={s.outcomeSub}>{timedOut ? 'You lost by forfeit.' : result === 'win' ? 'You won the round.' : result === 'loss' ? 'You lost the round.' : 'It was a tie.'}</Text>
            <View style={s.movesResult}>
              <View style={s.resultMove}><Text style={s.resultLabel}>YOU</Text>{selected && <HandArt move={selected} width={52} height={62} />}<Text style={s.resultName}>{labelOf(selected)}</Text></View>
              <Text style={s.resultVs}>VS</Text>
              <View style={s.resultMove}><Text style={s.resultLabel}>COMPUTER</Text>{opponent && <HandArt move={opponent} width={52} height={62} />}<Text style={s.resultName}>{labelOf(opponent)}</Text></View>
            </View>
            <Pressable onPress={reset} style={s.primary}><Text style={s.primaryText}>Play again</Text></Pressable>
            <Pressable onPress={onBack} style={s.secondary}><Text style={s.secondaryText}>Back to demo</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  virtualPill: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  virtualText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textPrimary, marginLeft: 5 },
  arena: { marginTop: 14, borderRadius: 22, backgroundColor: '#F4F7F1', padding: 15, overflow: 'hidden' },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { flexDirection: 'row', alignItems: 'center', minWidth: 155 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#B8754F', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  avatarText: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  name: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  sub: { fontFamily: fonts.regular, fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  timer: { height: 31, minWidth: 61, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78936C', marginRight: 6 },
  dotUrgent: { backgroundColor: '#D96A3C' },
  timerText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textPrimary },
  urgentText: { color: '#B44B2E' },
  handZone: { height: 125, alignItems: 'center', justifyContent: 'center' },
  vs: { flexDirection: 'row', alignItems: 'center', marginVertical: 1 },
  rule: { flex: 1, height: 1, backgroundColor: '#DDE3D9' },
  vsCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginHorizontal: 9 },
  vsText: { fontFamily: fonts.bold, fontSize: 10, color: colors.textSecondary },
  status: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textSecondary, maxWidth: 125, textAlign: 'right' },
  choicesTitle: { marginTop: 15, alignItems: 'center' },
  chooseTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textPrimary },
  choices: { flexDirection: 'row', gap: 9, marginTop: 10 },
  choice: { flex: 1, minHeight: 78, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E7EAE5', alignItems: 'center', justifyContent: 'center' },
  choiceSelected: { backgroundColor: '#E7F3D8', borderColor: '#B6C99F' },
  choicePressed: { backgroundColor: '#F4F8EF' },
  choiceDisabled: { opacity: 0.58 },
  choiceText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textPrimary, marginTop: 6 },
  note: { marginTop: 'auto', paddingTop: 13, flexDirection: 'row', alignItems: 'flex-start' },
  noteText: { flex: 1, marginLeft: 8, fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, color: colors.textSecondary },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,25,19,0.32)', alignItems: 'center', justifyContent: 'center', padding: 26, zIndex: 20 },
  outcome: { width: '100%', maxWidth: 360, borderRadius: 24, backgroundColor: colors.white, padding: 24, alignItems: 'center' },
  outcomeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  win: { backgroundColor: '#B8754F' },
  loss: { backgroundColor: '#F6C8B5' },
  tie: { backgroundColor: '#E4E7EA' },
  outcomeTitle: { fontFamily: fonts.bold, fontSize: 25, color: colors.textPrimary, marginTop: 13 },
  outcomeSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  movesResult: { width: '100%', marginTop: 18, padding: 13, borderRadius: 16, backgroundColor: '#F7F8F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  resultMove: { alignItems: 'center', minWidth: 90 },
  resultLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textSecondary },
  resultName: { fontFamily: fonts.semibold, fontSize: 10, color: colors.textPrimary, marginTop: 4 },
  resultVs: { fontFamily: fonts.bold, fontSize: 11, color: colors.textSecondary },
  primary: { width: '100%', height: 45, borderRadius: 13, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
  secondary: { width: '100%', height: 45, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderWidth: 1, borderColor: '#B8754F' },
  secondaryText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
});
