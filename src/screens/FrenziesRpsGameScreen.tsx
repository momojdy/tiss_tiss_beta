import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import FrenziesHeader from '../components/frenzies/FrenziesHeader';
import { colors } from '../theme/frenziesTheme';
import { fonts } from '../theme/frenziesFonts';

type Move = 'rock' | 'paper' | 'scissors';
type RoundResult = 'win' | 'loss' | 'tie';

const MOVES: { id: Move; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: 'rock', label: 'Rock', icon: 'hand-back-right' },
  { id: 'paper', label: 'Paper', icon: 'hand-back-right-outline' },
  { id: 'scissors', label: 'Scissors', icon: 'content-cut' },
];

const tx = (size: number, family: string, color: string = colors.textPrimary) => ({
  fontFamily: family, fontSize: size, lineHeight: size * 1.22, color, includeFontPadding: false,
});

function getComputerMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)].id;
}

function getResult(player: Move, computer: Move): RoundResult {
  if (player === computer) return 'tie';
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper')
  ) return 'win';
  return 'loss';
}

function moveLabel(move: Move) {
  return move.charAt(0).toUpperCase() + move.slice(1);
}

function MoveIcon({ move, size = 34 }: { move: Move; size?: number }) {
  const item = MOVES.find(m => m.id === move)!;
  return <MaterialCommunityIcons name={item.icon} size={size} color={colors.textPrimary} />;
}

export default function FrenziesRpsGameScreen({ onBack }: { onBack?: () => void }) {
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [round, setRound] = useState(1);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [computerMove, setComputerMove] = useState<Move | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const statusText = useMemo(() => {
    if (finished) {
      if (playerScore > computerScore) return 'You won the match!';
      return 'The computer won this match.';
    }
    if (!roundResult) return 'Choose your move';
    if (roundResult === 'tie') return 'Tie round — choose again';
    return roundResult === 'win' ? 'You won the round' : 'Computer won the round';
  }, [finished, playerScore, computerScore, roundResult]);

  const play = (move: Move) => {
    if (finished || roundResult) return;
    const cpu = getComputerMove();
    const result = getResult(move, cpu);
    const nextHistory = [...history, result];
    const nextPlayerScore = playerScore + (result === 'win' ? 1 : 0);
    const nextComputerScore = computerScore + (result === 'loss' ? 1 : 0);

    setPlayerMove(move);
    setComputerMove(cpu);
    setRoundResult(result);
    setHistory(nextHistory);
    setPlayerScore(nextPlayerScore);
    setComputerScore(nextComputerScore);

    if (nextPlayerScore >= 2 || nextComputerScore >= 2) setFinished(true);
  };

  const nextRound = () => {
    setRound(v => v + 1);
    setPlayerMove(null);
    setComputerMove(null);
    setRoundResult(null);
  };

  const reset = () => {
    setPlayerScore(0);
    setComputerScore(0);
    setRound(1);
    setPlayerMove(null);
    setComputerMove(null);
    setRoundResult(null);
    setFinished(false);
    setHistory([]);
  };

  return (
    <View style={s.safe}>
      <FrenziesHeader title="Rock Paper Scissors" onBack={onBack} showPoints={false} />
      <View style={s.content}>
        <View style={s.topLine}>
          <View>
            <Text style={tx(12, fonts.semibold, colors.textSecondary)}>DEMO MATCH</Text>
            <Text style={[tx(24, fonts.bold), { marginTop: 4 }]}>First to 2 wins</Text>
          </View>
          <View style={s.virtualPill}>
            <MaterialCommunityIcons name="gamepad-variant-outline" size={14} color={colors.textPrimary} />
            <Text style={[tx(10, fonts.bold), { marginLeft: 5 }]}>Virtual only</Text>
          </View>
        </View>

        <View style={s.scoreCard}>
          <View style={s.scoreSide}>
            <View style={s.avatar}><Text style={tx(14, fonts.bold)}>Y</Text></View>
            <Text style={[tx(11, fonts.semibold), { marginTop: 7 }]}>You</Text>
            <Text style={[tx(31, fonts.bold), { marginTop: 2 }]}>{playerScore}</Text>
          </View>
          <View style={s.scoreCenter}>
            <Text style={tx(11, fonts.medium, colors.textSecondary)}>ROUND</Text>
            <Text style={[tx(18, fonts.bold), { marginTop: 2 }]}>{round}</Text>
            <View style={s.roundDots}>
              {[0, 1, 2].map(i => <View key={i} style={[s.roundDot, history[i] && (history[i] === 'win' ? s.dotWin : history[i] === 'loss' ? s.dotLoss : s.dotTie)]} />)}
            </View>
          </View>
          <View style={s.scoreSide}>
            <View style={s.avatar}><MaterialCommunityIcons name="robot-outline" size={19} color={colors.textPrimary} /></View>
            <Text style={[tx(11, fonts.semibold), { marginTop: 7 }]}>Computer</Text>
            <Text style={[tx(31, fonts.bold), { marginTop: 2 }]}>{computerScore}</Text>
          </View>
        </View>

        <View style={s.arena}>
          <Text style={[tx(15, fonts.bold), { textAlign: 'center' }]}>{statusText}</Text>
          <View style={s.movesRow}>
            <View style={s.choice}>
              <View style={[s.moveBubble, playerMove && s.moveBubbleActive]}>
                {playerMove ? <MoveIcon move={playerMove} /> : <Text style={tx(23, fonts.bold, colors.rankings.rankMuted)}>?</Text>}
              </View>
              <Text style={[tx(11, fonts.semibold), { marginTop: 7 }]}>You</Text>
              {playerMove && <Text style={[tx(10, fonts.regular, colors.textSecondary), { marginTop: 2 }]}>{moveLabel(playerMove)}</Text>}
            </View>
            <View style={s.vs}><Text style={tx(12, fonts.bold, colors.textSecondary)}>VS</Text></View>
            <View style={s.choice}>
              <View style={[s.moveBubble, computerMove && s.moveBubbleComputer]}>
                {computerMove ? <MoveIcon move={computerMove} /> : <MaterialCommunityIcons name="robot-outline" size={28} color={colors.rankings.rankMuted} />}
              </View>
              <Text style={[tx(11, fonts.semibold), { marginTop: 7 }]}>Computer</Text>
              {computerMove && <Text style={[tx(10, fonts.regular, colors.textSecondary), { marginTop: 2 }]}>{moveLabel(computerMove)}</Text>}
            </View>
          </View>
        </View>

        {!finished && !roundResult && (
          <View style={s.pickSection}>
            <Text style={[tx(13, fonts.semibold), { textAlign: 'center' }]}>Make your move</Text>
            <View style={s.buttonsRow}>
              {MOVES.map(move => (
                <Pressable key={move.id} onPress={() => play(move.id)} style={({ pressed }) => [s.moveButton, pressed && s.moveButtonPressed]}>
                  <MaterialCommunityIcons name={move.icon} size={28} color={colors.textPrimary} />
                  <Text style={[tx(11, fonts.semibold), { marginTop: 7 }]}>{move.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {roundResult && !finished && (
          <View style={s.resultPanel}>
            <View style={[s.resultIcon, roundResult === 'win' ? s.resultWin : roundResult === 'loss' ? s.resultLoss : s.resultTie]}>
              <MaterialIcons name={roundResult === 'tie' ? 'remove' : roundResult === 'win' ? 'check' : 'close'} size={21} color={colors.textPrimary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={tx(13, fonts.bold)}>{roundResult === 'win' ? 'Nice move.' : roundResult === 'loss' ? 'Not this time.' : 'Same move.'}</Text>
              <Text style={[tx(10.5, fonts.regular, colors.textSecondary), { marginTop: 3 }]}>Round {round} is complete.</Text>
            </View>
            <Pressable onPress={nextRound} style={s.nextButton}><Text style={tx(11, fonts.bold)}>Next round</Text><MaterialIcons name="chevron-right" size={17} color={colors.textPrimary} /></Pressable>
          </View>
        )}

        {finished && (
          <View style={s.finishedPanel}>
            <View style={[s.resultIcon, playerScore > computerScore ? s.resultWin : s.resultLoss]}>
              <MaterialIcons name={playerScore > computerScore ? 'emoji-events' : 'replay'} size={22} color={colors.textPrimary} />
            </View>
            <Text style={[tx(18, fonts.bold), { marginTop: 9 }]}>{statusText}</Text>
            <Text style={[tx(11, fonts.regular, colors.textSecondary), { marginTop: 4 }]}>
              Final score {playerScore}–{computerScore}. No real money was used.
            </Text>
            <View style={s.finishedActions}>
              <Pressable onPress={reset} style={s.playAgain}><Text style={tx(12, fonts.bold)}>Play again</Text></Pressable>
              <Pressable onPress={onBack} style={s.backButton}><Text style={tx(12, fonts.bold)}>Back to demo</Text></Pressable>
            </View>
          </View>
        )}

        <View style={s.note}>
          <MaterialCommunityIcons name="shield-check-outline" size={17} color={colors.textSecondary} />
          <Text style={[tx(10.5, fonts.regular, colors.textSecondary), { flex: 1, marginLeft: 8, lineHeight: 15 }]}>
            This is practice only. Demo play is completely separate from your Wantiss Wallet.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 28 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  virtualPill: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  scoreCard: { marginTop: 18, paddingVertical: 15, borderRadius: 20, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#EEF0F3', flexDirection: 'row', alignItems: 'center' },
  scoreSide: { flex: 1, alignItems: 'center' },
  scoreCenter: { width: 74, alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.streak.shieldPill, alignItems: 'center', justifyContent: 'center' },
  roundDots: { flexDirection: 'row', gap: 5, marginTop: 8 },
  roundDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D9DCE1' },
  dotWin: { backgroundColor: '#B3DF4B' },
  dotLoss: { backgroundColor: '#F2B29A' },
  dotTie: { backgroundColor: '#C7CBD2' },
  arena: { marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: colors.hero.gradient.colors[0] },
  movesRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  choice: { flex: 1, alignItems: 'center' },
  moveBubble: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,.58)', alignItems: 'center', justifyContent: 'center' },
  moveBubbleActive: { backgroundColor: 'rgba(255,255,255,.82)' },
  moveBubbleComputer: { backgroundColor: 'rgba(255,255,255,.72)' },
  vs: { width: 38, alignItems: 'center' },
  pickSection: { marginTop: 19 },
  buttonsRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  moveButton: { flex: 1, minHeight: 88, borderRadius: 17, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: '#EEF0F3', alignItems: 'center', justifyContent: 'center' },
  moveButtonPressed: { backgroundColor: '#F4F8F0', borderColor: '#DCE8D2' },
  resultPanel: { marginTop: 18, minHeight: 72, padding: 11, borderRadius: 16, backgroundColor: '#F7F8FA', flexDirection: 'row', alignItems: 'center' },
  resultIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultWin: { backgroundColor: colors.streak.shieldPill },
  resultLoss: { backgroundColor: '#F6C5B1' },
  resultTie: { backgroundColor: '#E2E5E9' },
  nextButton: { height: 34, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.streak.shieldPill, flexDirection: 'row', alignItems: 'center' },
  finishedPanel: { marginTop: 18, padding: 18, borderRadius: 18, backgroundColor: '#F4F8F0', alignItems: 'center' },
  finishedActions: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 15 },
  playAgain: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.gameCard.playBg, alignItems: 'center', justifyContent: 'center' },
  backButton: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: '#DCE8D2', alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: 'auto', paddingTop: 16, flexDirection: 'row', alignItems: 'flex-start' },
});
