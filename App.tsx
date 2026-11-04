import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Cell, createPuzzle, generateMaze, pointKey, Point, Puzzle } from './src/game';

type Direction = { row: number; col: number };
type Phase = 'intro' | 'playing' | 'puzzle' | 'won';

const DIRECTIONS: Record<'up' | 'left' | 'right' | 'down', Direction> = {
  up: { row: -1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
};

const cellSymbol = (cell: Cell, isPlayer: boolean, solved: boolean) => {
  if (isPlayer) return '◆';
  if (cell === 'exit') return '◇';
  if (cell === 'puzzle') return solved ? '·' : '✦';
  return '';
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const [maze, setMaze] = useState(() => generateMaze(Date.now()));
  const [phase, setPhase] = useState<Phase>('intro');
  const [player, setPlayer] = useState<Point>(maze.start);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [activeGate, setActiveGate] = useState<Point | null>(null);
  const [wrongChoice, setWrongChoice] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const boardWidth = Math.min(width - 28, height < 700 ? 330 : 410);
  const cellSize = Math.floor(boardWidth / maze.cols);

  const resetRun = (startImmediately = true) => {
    const nextMaze = generateMaze(Date.now() + moves * 97 + mistakes * 31);
    setMaze(nextMaze);
    setPlayer(nextMaze.start);
    setPhase(startImmediately ? 'playing' : 'intro');
    setSolved(new Set());
    setMoves(0);
    setMistakes(0);
    setHints(0);
    setPuzzle(null);
    setActiveGate(null);
    setWrongChoice(null);
    setShowHint(false);
  };

  const enterCell = (target: Point) => {
    setPlayer(target);
    setMoves((current) => current + 1);
    if (pointKey(target) === pointKey(maze.exit)) setPhase('won');
  };

  const move = ({ row, col }: Direction) => {
    if (phase !== 'playing') return;
    const target = { row: player.row + row, col: player.col + col };
    const cell = maze.cells[target.row]?.[target.col];
    if (!cell || cell === 'wall') return;

    const key = pointKey(target);
    if (cell === 'puzzle' && !solved.has(key)) {
      setActiveGate(target);
      setPuzzle(createPuzzle(Date.now() + moves * 97 + mistakes * 31));
      setWrongChoice(null);
      setShowHint(false);
      setPhase('puzzle');
      return;
    }
    enterCell(target);
  };

  const chooseAnswer = (choice: string) => {
    if (!puzzle || !activeGate) return;
    if (choice !== puzzle.answer) {
      setMistakes((current) => current + 1);
      setWrongChoice(choice);
      return;
    }
    setSolved((current) => new Set(current).add(pointKey(activeGate)));
    setWrongChoice(null);
    setShowHint(false);
    setPhase('playing');
    enterCell(activeGate);
    setActiveGate(null);
    setPuzzle(null);
  };

  return (
    <LinearGradient colors={['#07101f', '#101a2b', '#05070d']} style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />

      {phase === 'intro' ? (
        <SafeAreaView style={styles.full}>
          <View style={styles.intro}>
            <View style={styles.sigilOuter}>
              <View style={styles.sigilInner}><Text style={styles.sigil}>◇</Text></View>
            </View>
            <Text style={styles.kicker}>DAS ERSTE ARCHIV</Text>
            <Text style={styles.logo}>MIND{`\n`}MAZE</Text>
            <Text style={styles.introText}>
              Der Ausgang ist nah. Der Weg dorthin prüft mehr als deinen Orientierungssinn.
            </Text>
            <View style={styles.rulesCard}>
              <Rule icon="◆" text="Finde den Ausgang" />
              <Rule icon="✦" text="Löse drei Siegel" />
              <Rule icon="∞" text="Jeder Durchlauf ist neu" />
            </View>
            <Pressable accessibilityRole="button" onPress={() => setPhase('playing')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>ARCHIV BETRETEN</Text>
              <Text style={styles.buttonArrow}>→</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.full}>
          <ScrollView contentContainerStyle={styles.game} bounces={false}>
            <View style={styles.gameHeader}>
              <View>
                <Text style={styles.gameKicker}>ARCHIV I</Text>
                <Text style={styles.gameTitle}>Der versunkene Pfad</Text>
              </View>
              <Pressable accessibilityLabel="Zum Startbildschirm" onPress={() => resetRun(false)} style={styles.iconButton}>
                <Text style={styles.iconButtonText}>↻</Text>
              </Pressable>
            </View>

            <View style={styles.stats}>
              <Stat label="SCHRITTE" value={String(moves).padStart(2, '0')} />
              <View style={styles.statDivider} />
              <Stat label="SIEGEL" value={`${solved.size}/${maze.puzzleKeys.length}`} accent />
              <View style={styles.statDivider} />
              <Stat label="FEHLER" value={String(mistakes).padStart(2, '0')} />
            </View>

            <View style={styles.boardFrame}>
              <View style={[styles.board, { width: cellSize * maze.cols }]}>
                {maze.cells.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.boardRow}>
                    {row.map((cell, colIndex) => {
                      const key = `${rowIndex}:${colIndex}`;
                      const isPlayer = player.row === rowIndex && player.col === colIndex;
                      const isSolved = solved.has(key);
                      return (
                        <View
                          key={key}
                          style={[
                            styles.cell,
                            { width: cellSize, height: cellSize },
                            cell === 'wall' ? styles.wall : styles.path,
                            cell === 'exit' && styles.exit,
                            cell === 'puzzle' && !isSolved && styles.gate,
                          ]}
                        >
                          <Text style={[styles.cellSymbol, isPlayer && styles.player, cell === 'exit' && styles.exitSymbol]}>
                            {cellSymbol(cell, isPlayer, isSolved)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.instruction}>
              {solved.size === maze.puzzleKeys.length
                ? 'Alle Siegel sind offen. Finde jetzt den Ausgang ◇'
                : 'Finde die leuchtenden Siegel ✦'}
            </Text>

            <View style={styles.controls}>
              <Control label="↑" onPress={() => move(DIRECTIONS.up)} style={styles.controlUp} />
              <Control label="←" onPress={() => move(DIRECTIONS.left)} style={styles.controlLeft} />
              <View style={styles.controlCore}><Text style={styles.controlCoreText}>◆</Text></View>
              <Control label="→" onPress={() => move(DIRECTIONS.right)} style={styles.controlRight} />
              <Control label="↓" onPress={() => move(DIRECTIONS.down)} style={styles.controlDown} />
            </View>
          </ScrollView>
        </SafeAreaView>
      )}

      <Modal transparent visible={phase === 'puzzle'} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.puzzleCard}>
            <Text style={styles.puzzleNumber}>SIEGEL {solved.size + 1} / {maze.puzzleKeys.length}</Text>
            <View style={styles.puzzleIcon}><Text style={styles.puzzleIconText}>✦</Text></View>
            <Text style={styles.puzzleCategory}>{puzzle?.category}</Text>
            <Text style={styles.puzzlePrompt}>{puzzle?.prompt}</Text>
            <View style={styles.answers}>
              {puzzle?.options.map((option) => (
                <Pressable key={option} onPress={() => chooseAnswer(option)} style={[styles.answer, wrongChoice === option && styles.answerWrong]}>
                  <Text style={styles.answerText}>{option}</Text>
                </Pressable>
              ))}
            </View>
            {wrongChoice && <Text style={styles.wrongText}>Das Siegel bleibt geschlossen. Versuch es noch einmal.</Text>}
            {showHint ? (
              <Text style={styles.hintText}>Hinweis: {puzzle?.hint}</Text>
            ) : (
              <Pressable onPress={() => { setShowHint(true); setHints((value) => value + 1); }}>
                <Text style={styles.hintButton}>EINEN HINWEIS NUTZEN</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={phase === 'won'} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.victoryCard}>
            <Text style={styles.victoryMark}>◇</Text>
            <Text style={styles.victoryKicker}>ARCHIV ENTSCHLÜSSELT</Text>
            <Text style={styles.victoryTitle}>Der Weg gehört dir.</Text>
            <Text style={styles.victoryText}>Du hast Orientierung und Verstand bewiesen.</Text>
            <View style={styles.victoryStats}>
              <Stat label="SCHRITTE" value={String(moves)} />
              <Stat label="FEHLER" value={String(mistakes)} />
              <Stat label="HINWEISE" value={String(hints)} accent />
            </View>
            <Pressable onPress={() => resetRun(true)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>NEUES LABYRINTH</Text>
              <Text style={styles.buttonArrow}>↻</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return <View style={styles.rule}><Text style={styles.ruleIcon}>{icon}</Text><Text style={styles.ruleText}>{text}</Text></View>;
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={[styles.statValue, accent && styles.accent]}>{value}</Text></View>;
}

function Control({ label, onPress, style }: { label: string; onPress: () => void; style: object }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.control, style]}><Text style={styles.controlText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070d' },
  full: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.12 },
  orbOne: { width: 280, height: 280, backgroundColor: '#26d9d1', top: -130, right: -120 },
  orbTwo: { width: 220, height: 220, backgroundColor: '#c89a4b', bottom: -120, left: -100 },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  sigilOuter: { width: 92, height: 92, borderWidth: 1, borderColor: '#b88a43', transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  sigilInner: { width: 62, height: 62, borderWidth: 1, borderColor: '#3bc8c2', alignItems: 'center', justifyContent: 'center' },
  sigil: { color: '#e4bd72', fontSize: 42, transform: [{ rotate: '-45deg' }] },
  kicker: { color: '#62d9d4', fontSize: 11, fontWeight: '800', letterSpacing: 4, marginBottom: 10 },
  logo: { color: '#f5ead7', fontSize: 52, lineHeight: 48, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  introText: { color: '#9daabd', maxWidth: 360, textAlign: 'center', fontSize: 15, lineHeight: 23, marginTop: 22 },
  rulesCard: { flexDirection: 'row', width: '100%', maxWidth: 410, justifyContent: 'space-between', marginVertical: 34, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#26344a' },
  rule: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  ruleIcon: { color: '#d4a85d', fontSize: 19, marginBottom: 7 },
  ruleText: { color: '#8e9aae', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  primaryButton: { width: '100%', maxWidth: 410, minHeight: 58, backgroundColor: '#d2a559', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 3, shadowColor: '#d2a559', shadowOpacity: 0.25, shadowRadius: 18 },
  primaryButtonText: { color: '#111827', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  buttonArrow: { color: '#111827', fontSize: 22, position: 'absolute', right: 22 },
  game: { alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 28 },
  gameHeader: { width: '100%', maxWidth: 440, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  gameKicker: { color: '#52d2cc', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  gameTitle: { color: '#f2e7d6', fontSize: 21, fontWeight: '700', marginTop: 3 },
  iconButton: { width: 42, height: 42, borderWidth: 1, borderColor: '#314157', alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  iconButtonText: { color: '#aab6c6', fontSize: 22 },
  stats: { width: '100%', maxWidth: 440, flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: '#243147', backgroundColor: '#0b1422', paddingVertical: 10, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#68778c', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  statValue: { color: '#e9e1d3', fontSize: 18, fontWeight: '800', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#243147' },
  accent: { color: '#56d6d0' },
  boardFrame: { padding: 8, borderWidth: 1, borderColor: '#34445a', backgroundColor: '#08101b', shadowColor: '#52d2cc', shadowOpacity: 0.12, shadowRadius: 18 },
  board: { borderWidth: 1, borderColor: '#1d2c40' },
  boardRow: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  wall: { backgroundColor: '#101d2c', borderWidth: 0.5, borderColor: '#172a3e' },
  path: { backgroundColor: '#080e18', borderWidth: 0.5, borderColor: '#111c2b' },
  gate: { backgroundColor: '#21312e' },
  exit: { backgroundColor: '#172a35' },
  cellSymbol: { color: '#c89b4f', fontSize: 14, fontWeight: '900' },
  player: { color: '#63ebe3', fontSize: 19, textShadowColor: '#5be1da', textShadowRadius: 9 },
  exitSymbol: { color: '#f0c572', fontSize: 20 },
  instruction: { color: '#8090a5', fontSize: 11, marginTop: 12, letterSpacing: 0.4 },
  controls: { width: 190, height: 132, marginTop: 14, position: 'relative' },
  control: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101b2b', borderWidth: 1, borderColor: '#34435a', borderRadius: 4 },
  controlText: { color: '#d4dddf', fontSize: 25 },
  controlUp: { top: 0, left: 67 },
  controlLeft: { top: 60, left: 5 },
  controlRight: { top: 60, right: 5 },
  controlDown: { top: 60, left: 67 },
  controlCore: { position: 'absolute', width: 44, height: 44, left: 73, top: 66, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  controlCoreText: { color: '#2e938f', fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 5, 10, 0.9)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  puzzleCard: { width: '100%', maxWidth: 430, backgroundColor: '#101a29', borderWidth: 1, borderColor: '#3c4d64', padding: 24, alignItems: 'center', borderRadius: 5 },
  puzzleNumber: { color: '#64768c', fontSize: 9, fontWeight: '800', letterSpacing: 2.5 },
  puzzleIcon: { width: 58, height: 58, borderWidth: 1, borderColor: '#b88d49', transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  puzzleIconText: { color: '#e4b660', fontSize: 25, transform: [{ rotate: '-45deg' }] },
  puzzleCategory: { color: '#58d7d1', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  puzzlePrompt: { color: '#f3eadc', fontSize: 23, lineHeight: 31, fontWeight: '700', textAlign: 'center', marginVertical: 20 },
  answers: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  answer: { width: '48%', minHeight: 52, borderWidth: 1, borderColor: '#35465d', backgroundColor: '#0b1421', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 3 },
  answerWrong: { borderColor: '#a65454', backgroundColor: '#2b171c' },
  answerText: { color: '#e2e8ef', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  wrongText: { color: '#e58c8c', fontSize: 12, textAlign: 'center', marginTop: 14 },
  hintButton: { color: '#8da1b6', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 20, textDecorationLine: 'underline' },
  hintText: { color: '#c7ad79', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 18 },
  victoryCard: { width: '100%', maxWidth: 430, backgroundColor: '#101a29', borderWidth: 1, borderColor: '#b18749', padding: 28, alignItems: 'center', borderRadius: 5 },
  victoryMark: { color: '#e3b45f', fontSize: 64 },
  victoryKicker: { color: '#58d7d1', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginTop: 14 },
  victoryTitle: { color: '#f3eadc', fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  victoryText: { color: '#94a1b3', fontSize: 14, textAlign: 'center', marginTop: 10 },
  victoryStats: { width: '100%', flexDirection: 'row', marginVertical: 28 },
});
