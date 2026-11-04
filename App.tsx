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

import {
  Action,
  CHAMBERS,
  createInitialState,
  getActivePlates,
  getEchoPositions,
  isPulseActive,
  memoryUsed,
  pointKey,
  recordEcho,
  resetLoop,
  step,
  Tile,
  turnLimit,
} from './src/game';

type Phase = 'intro' | 'briefing' | 'playing' | 'complete' | 'victory';

const echoColors = ['#5de4de', '#b68cff', '#f08baf'];

export default function App() {
  const { width, height } = useWindowDimensions();
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [game, setGame] = useState(() => createInitialState(0));

  const boardWidth = Math.min(width - 24, height < 700 ? 340 : 420);
  const cellSize = Math.floor(boardWidth / game.chamber.map[0].length);
  const echoPositions = getEchoPositions(game);
  const activePlates = getActivePlates(game);
  const currentTurnLimit = turnLimit(game);
  const usedMemory = memoryUsed(game);
  const timeExpired = game.turn >= currentTurnLimit;
  const echoCycleRemaining = game.chamber.echoCycleLength
    ? game.chamber.echoCycleLength - (game.turn % game.chamber.echoCycleLength)
    : null;

  const startGame = () => {
    setGame(createInitialState(selectedLevel));
    setPhase('briefing');
  };

  const perform = (action: Action) => {
    const next = step(game, action);
    setGame(next);
    if (next.status === 'complete') setPhase('complete');
  };

  const saveEcho = () => setGame(recordEcho(game));

  const continueAfterChamber = () => {
    if (game.chamber.id === CHAMBERS.length) {
      setPhase('victory');
      return;
    }
    setGame(createInitialState(game.chamber.id));
    setPhase('briefing');
  };

  return (
    <LinearGradient colors={['#03060c', '#0a1422', '#05070d']} style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.glow, styles.glowCyan]} />
      <View style={[styles.glow, styles.glowViolet]} />

      {phase === 'intro' ? (
        <SafeAreaView style={styles.full}>
          <ScrollView contentContainerStyle={styles.intro} bounces={false}>
            <View style={styles.echoMark}>
              <Text style={[styles.echoRune, { color: echoColors[1], left: 12 }]}>◇</Text>
              <Text style={[styles.echoRune, { color: echoColors[0], right: 12 }]}>◇</Text>
              <Text style={styles.echoCore}>◆</Text>
            </View>
            <Text style={styles.eyebrow}>DAS ARCHIV ERINNERT SICH</Text>
            <Text style={styles.logo}>ECHO{`\n`}MAZE</Text>
            <Text style={styles.tagline}>Löse das Labyrinth mit den Bewegungen deiner Vergangenheit.</Text>
            <View style={styles.levelPicker}>
              <Pressable onPress={() => setSelectedLevel((value) => (value + CHAMBERS.length - 1) % CHAMBERS.length)} style={styles.pickerButton}>
                <Text style={styles.pickerArrow}>‹</Text>
              </Pressable>
              <View style={styles.pickerCenter}>
                <Text style={styles.pickerIndex}>KAMMER {String(selectedLevel + 1).padStart(2, '0')} / {CHAMBERS.length}</Text>
                <Text style={styles.pickerName}>{CHAMBERS[selectedLevel].name}</Text>
              </View>
              <Pressable onPress={() => setSelectedLevel((value) => (value + 1) % CHAMBERS.length)} style={styles.pickerButton}>
                <Text style={styles.pickerArrow}>›</Text>
              </Pressable>
            </View>
            <View style={styles.featureLine}>
              <Feature number="01" text="Zeichne einen Weg auf" />
              <Feature number="02" text="Erschaffe dein Echo" />
              <Feature number="30" text="Einzigartige Kammern" />
            </View>
            <Pressable onPress={startGame} style={styles.primaryButton}>
              <Text style={styles.primaryText}>ERINNERUNG BEGINNEN</Text>
              <Text style={styles.primaryArrow}>→</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.full}>
          <ScrollView contentContainerStyle={styles.gameScreen} bounces={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.chapter}>KAMMER {String(game.chamber.id).padStart(2, '0')} / {CHAMBERS.length} · {game.chamber.tier}</Text>
                <Text style={styles.title}>{game.chamber.name}</Text>
              </View>
              <Pressable onPress={() => setPhase('intro')} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.timelineCard}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineLabel}>{echoCycleRemaining ? `ECHO-RÜCKLAUF IN ${echoCycleRemaining}` : 'AKTUELLE ZEITLINIE'}</Text>
                <Text style={[styles.turnCount, timeExpired && styles.danger]}>{game.turn} / {currentTurnLimit}</Text>
              </View>
              <View style={styles.timeline}>
                {Array.from({ length: currentTurnLimit }).map((_, index) => (
                  <View key={index} style={[styles.tick, index < game.turn && styles.tickPast, index === game.turn && styles.tickNow]} />
                ))}
              </View>
              <View style={styles.echoStatusRow}>
                {Array.from({ length: game.chamber.maxEchoes }).map((_, index) => (
                  <View key={index} style={styles.echoStatus}>
                    <View style={[styles.echoDot, { borderColor: echoColors[index] }, game.echoes[index] && { backgroundColor: echoColors[index] }]} />
                    <Text style={styles.echoStatusText}>ECHO {index + 1} {game.echoes[index] ? 'AKTIV' : 'LEER'}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.memoryRow}>
                <Text style={styles.memoryLabel}>GESAMTERINNERUNG</Text>
                <Text style={styles.memoryValue}>{usedMemory} / {game.chamber.memoryBudget}</Text>
              </View>
            </View>

            <View style={styles.boardShell}>
              <View style={[styles.board, { width: cellSize * game.chamber.map[0].length }]}>
                {game.chamber.map.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.boardRow}>
                    {[...row].map((tile, colIndex) => {
                      const point = { row: rowIndex, col: colIndex };
                      const key = pointKey(point);
                      const echoesHere = echoPositions
                        .map((echo, index) => ({ echo, index }))
                        .filter(({ echo }) => pointKey(echo) === key);
                      const isPlayer = pointKey(game.player) === key;
                      const collapsed = game.collapsed.has(key);
                      const openGate =
                        (tile === 'A' && activePlates.has('a')) ||
                        (tile === 'X' && activePlates.has('a') && activePlates.has('b')) ||
                        (tile === 'Z' && activePlates.has('a') && activePlates.has('b') && activePlates.has('c')) ||
                        (tile === 'Q' && !isPulseActive(game.turn + 1));
                      return (
                        <View
                          key={key}
                          style={[
                            styles.cell,
                            { width: cellSize, height: cellSize },
                            tile === '#' ? styles.wall : styles.floor,
                            (tile === 'a' || tile === 'b' || tile === 'c') && styles.plate,
                            (tile === 'A' || tile === 'X' || tile === 'Z' || tile === 'Q') && !openGate && styles.gate,
                            openGate && styles.openGate,
                            tile === '~' && styles.fragile,
                            tile === '^' && (isPulseActive(game.turn + 1) ? styles.pulseHot : styles.pulseSafe),
                            tile === 'E' && styles.exit,
                            collapsed && styles.collapsed,
                          ]}
                        >
                          <Text style={[styles.tileSymbol, tile === '^' && isPulseActive(game.turn + 1) && styles.danger]}>
                            {tileSymbol(tile as Tile, openGate, collapsed, game.turn)}
                          </Text>
                          {echoesHere.map(({ index }) => (
                            <Text key={index} style={[styles.echoPlayer, { color: echoColors[index] }]}>◇</Text>
                          ))}
                          {isPlayer && <Text style={styles.player}>◆</Text>}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.legend}>
              <Legend symbol="◇" text="Echo" color={echoColors[0]} />
              <Legend symbol="◉" text="Platte" color="#d5a95f" />
              <Legend symbol="╳" text="Bruch" color="#cc7b65" />
              <Legend symbol="△" text="Impuls" color="#e87878" />
              <Legend symbol="▥" text="Takttor" color="#b68cff" />
            </View>

            <Text style={styles.guidance}>
              {timeExpired
                ? 'Kein Zug bleibt übrig. Kürzere Echo-Wege geben der finalen Zeitlinie mehr Raum.'
                : game.chamber.lesson}
            </Text>

            <View style={styles.controlArea}>
              <View style={styles.dpad}>
                <MoveButton label="↑" onPress={() => perform('up')} style={styles.up} />
                <MoveButton label="←" onPress={() => perform('left')} style={styles.left} />
                <MoveButton label="⧖" onPress={() => perform('wait')} style={styles.wait} special />
                <MoveButton label="→" onPress={() => perform('right')} style={styles.right} />
                <MoveButton label="↓" onPress={() => perform('down')} style={styles.down} />
              </View>
              <View style={styles.actionColumn}>
                <Pressable
                  onPress={saveEcho}
                  disabled={game.recording.length < 2 || game.echoes.length >= game.chamber.maxEchoes}
                  style={({ pressed }) => [styles.echoButton, pressed && styles.pressed, (game.recording.length < 2 || game.echoes.length >= game.chamber.maxEchoes) && styles.disabled]}
                >
                  <Text style={styles.echoButtonIcon}>◇</Text>
                  <View><Text style={styles.echoButtonTitle}>ECHO SPEICHERN</Text><Text style={styles.echoButtonSub}>{game.turn} Züge aufzeichnen</Text></View>
                </Pressable>
                <View style={styles.resetRow}>
                  <Pressable onPress={() => setGame(resetLoop(game, true))}><Text style={styles.resetText}>↻ Schleife neu</Text></Pressable>
                  <Pressable onPress={() => setGame(resetLoop(game, false))}><Text style={styles.resetText}>⌫ Echos löschen</Text></Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      )}

      <Modal visible={phase === 'briefing'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.briefingCard}>
            <Text style={styles.modalIndex}>KAMMER {String(game.chamber.id).padStart(2, '0')}</Text>
            <Text style={styles.modalRune}>◇◆◇</Text>
            <Text style={styles.modalTitle}>{game.chamber.name}</Text>
            <Text style={styles.modalSubtitle}>{game.chamber.subtitle}</Text>
            <View style={styles.briefingRule}><Text style={styles.briefingRuleText}>{game.chamber.lesson}</Text></View>
            <Text style={styles.briefingMeta}>{game.chamber.memoryBudget} GESAMTZÜGE · {game.chamber.maxEchoes} {game.chamber.maxEchoes === 1 ? 'ECHO' : 'ECHOS'}{game.chamber.echoCycleLength ? ` · ${game.chamber.echoCycleLength}ER RÜCKLAUF` : ''}</Text>
            <Pressable onPress={() => setPhase('playing')} style={styles.primaryButton}>
              <Text style={styles.primaryText}>KAMMER BETRETEN</Text><Text style={styles.primaryArrow}>→</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={game.status === 'fallen' && phase === 'playing'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.failureCard}>
            <Text style={styles.failureIcon}>⌁</Text>
            <Text style={styles.modalIndex}>ZEITLINIE GEBROCHEN</Text>
            <Text style={styles.modalTitle}>Du fällst aus der Erinnerung.</Text>
            <Text style={styles.failureText}>{game.failureReason}</Text>
            <Pressable onPress={() => setGame(resetLoop(game, true))} style={styles.primaryButton}>
              <Text style={styles.primaryText}>SCHLEIFE WIEDERHOLEN</Text><Text style={styles.primaryArrow}>↻</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={phase === 'complete'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.completeCard}>
            <Text style={styles.modalIndex}>KAMMER SYNCHRONISIERT</Text>
            <Text style={styles.sealRune}>✦</Text>
            <Text style={styles.modalTitle}>Das Siegel entsteht aus deinen Zeitlinien.</Text>
            <Text style={styles.completeText}>{game.echoes.length} Echos · {game.turn} finale Züge · {usedMemory}/{game.chamber.memoryBudget} Erinnerung</Text>
            <Pressable onPress={continueAfterChamber} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{game.chamber.id === CHAMBERS.length ? 'ARCHIV VOLLENDEN' : 'NÄCHSTE KAMMER'}</Text>
              <Text style={styles.primaryArrow}>→</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={phase === 'victory'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.victoryCard}>
            <Text style={styles.victoryEchoes}>◇ ◇ ◆ ◇ ◇</Text>
            <Text style={styles.modalIndex}>DAS ARCHIV IST VOLLSTÄNDIG</Text>
            <Text style={styles.victoryTitle}>Du hast mit deiner Vergangenheit zusammengearbeitet.</Text>
            <Text style={styles.victoryText}>30 Kammern. 66 Pflicht-Tore. Keine Abkürzung durch die Zeit.</Text>
            <Pressable onPress={startGame} style={styles.primaryButton}>
              <Text style={styles.primaryText}>ERNEUT EINTRETEN</Text><Text style={styles.primaryArrow}>↻</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function tileSymbol(tile: Tile, open: boolean, collapsed: boolean, turn: number) {
  if (collapsed) return '·';
  if (tile === 'a') return 'Ⅰ';
  if (tile === 'b') return 'Ⅱ';
  if (tile === 'c') return 'Ⅲ';
  if (tile === 'A' || tile === 'X' || tile === 'Z') return open ? '┆' : '║';
  if (tile === 'Q') return open ? '┆' : '▥';
  if (tile === '~') return '╳';
  if (tile === '^') return isPulseActive(turn + 1) ? '▲' : '△';
  if (tile === 'E') return '✦';
  if (tile === 'S') return '○';
  return '';
}

function Feature({ number, text }: { number: string; text: string }) {
  return <View style={styles.feature}><Text style={styles.featureNumber}>{number}</Text><Text style={styles.featureText}>{text}</Text></View>;
}

function Legend({ symbol, text, color }: { symbol: string; text: string; color: string }) {
  return <View style={styles.legendItem}><Text style={[styles.legendSymbol, { color }]}>{symbol}</Text><Text style={styles.legendText}>{text}</Text></View>;
}

function MoveButton({ label, onPress, style, special = false }: { label: string; onPress: () => void; style: object; special?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.moveButton, style, special && styles.waitButton, pressed && styles.pressed]}><Text style={[styles.moveText, special && styles.waitText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03060c' },
  full: { flex: 1 },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 999, opacity: 0.1 },
  glowCyan: { backgroundColor: '#43d6cf', top: -170, right: -100 },
  glowViolet: { backgroundColor: '#8f67dc', bottom: -170, left: -100 },
  intro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 26 },
  echoMark: { width: 150, height: 82, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  echoRune: { position: 'absolute', fontSize: 68, opacity: 0.5 },
  echoCore: { color: '#f2c46f', fontSize: 46, textShadowColor: '#e5a94d', textShadowRadius: 16 },
  eyebrow: { color: '#5dded8', fontSize: 10, fontWeight: '900', letterSpacing: 3.5 },
  logo: { color: '#f5eddf', fontSize: 52, lineHeight: 48, fontWeight: '900', letterSpacing: 7, textAlign: 'center', marginTop: 11 },
  tagline: { color: '#97a6ba', fontSize: 15, lineHeight: 23, maxWidth: 360, textAlign: 'center', marginTop: 20 },
  levelPicker: { width: '100%', maxWidth: 410, minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2d4059', backgroundColor: '#091321', marginTop: 22 },
  pickerButton: { width: 52, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: '#101d2e' },
  pickerArrow: { color: '#6edbd5', fontSize: 30, lineHeight: 32 },
  pickerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  pickerIndex: { color: '#b58aee', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  pickerName: { color: '#e8dfd1', fontSize: 13, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  featureLine: { width: '100%', maxWidth: 430, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#25344a', marginVertical: 22, paddingVertical: 15 },
  feature: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  featureNumber: { color: '#b58aee', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  featureText: { color: '#8290a4', fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 7 },
  primaryButton: { width: '100%', maxWidth: 410, minHeight: 58, backgroundColor: '#d7aa5b', borderRadius: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#d7aa5b', shadowOpacity: 0.25, shadowRadius: 18 },
  primaryText: { color: '#10131b', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  primaryArrow: { position: 'absolute', right: 21, color: '#10131b', fontSize: 20 },
  gameScreen: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 26 },
  header: { width: '100%', maxWidth: 450, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chapter: { color: '#58d7d1', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  title: { color: '#f2e9dc', fontSize: 20, fontWeight: '800', marginTop: 4 },
  smallButton: { width: 38, height: 38, borderWidth: 1, borderColor: '#314058', alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: '#8c9bb0', fontSize: 23 },
  timelineCard: { width: '100%', maxWidth: 450, backgroundColor: '#091220', borderWidth: 1, borderColor: '#24354d', padding: 11, marginBottom: 10 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineLabel: { color: '#77889d', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  turnCount: { color: '#d5ac67', fontSize: 12, fontWeight: '900' },
  timeline: { flexDirection: 'row', gap: 3, marginVertical: 9 },
  tick: { height: 4, flex: 1, backgroundColor: '#1d2b3f' },
  tickPast: { backgroundColor: '#4eaaa7' },
  tickNow: { backgroundColor: '#f0c36f', height: 7, marginTop: -1.5 },
  echoStatusRow: { flexDirection: 'row', gap: 18 },
  echoStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  echoDot: { width: 8, height: 8, borderRadius: 8, borderWidth: 1 },
  echoStatusText: { color: '#66778c', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  memoryRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1d2c40', marginTop: 9, paddingTop: 8 },
  memoryLabel: { color: '#697b90', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  memoryValue: { color: '#d5ac67', fontSize: 10, fontWeight: '900' },
  boardShell: { padding: 8, backgroundColor: '#070d16', borderWidth: 1, borderColor: '#34465f', shadowColor: '#5edbd5', shadowOpacity: 0.12, shadowRadius: 18 },
  board: { borderWidth: 1, borderColor: '#203047' },
  boardRow: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  floor: { backgroundColor: '#09111d', borderWidth: 0.5, borderColor: '#142136' },
  wall: { backgroundColor: '#162437', borderWidth: 0.5, borderColor: '#20334b', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 2 },
  plate: { backgroundColor: '#29251d', borderColor: '#8c713e', borderWidth: 1 },
  gate: { backgroundColor: '#342928', borderColor: '#a16c57', borderWidth: 1 },
  openGate: { backgroundColor: '#102723', borderColor: '#4bb5a7', borderWidth: 1 },
  fragile: { backgroundColor: '#211a1d', borderColor: '#7a4e4b', borderWidth: 1 },
  collapsed: { backgroundColor: '#020306', borderColor: '#0b0d12' },
  pulseHot: { backgroundColor: '#351b26', borderColor: '#a84d62', borderWidth: 1 },
  pulseSafe: { backgroundColor: '#13282d', borderColor: '#458a91', borderWidth: 1 },
  exit: { backgroundColor: '#332b1c', borderColor: '#c99c4f', borderWidth: 1 },
  tileSymbol: { color: '#8c9bb0', fontSize: 15, fontWeight: '900' },
  player: { position: 'absolute', color: '#f2c46f', fontSize: 20, textShadowColor: '#f2b950', textShadowRadius: 10, zIndex: 4 },
  echoPlayer: { position: 'absolute', fontSize: 21, fontWeight: '900', textShadowColor: '#62ddd7', textShadowRadius: 8, zIndex: 3 },
  danger: { color: '#f07777' },
  legend: { flexDirection: 'row', width: '100%', maxWidth: 420, justifyContent: 'space-around', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSymbol: { fontSize: 14, fontWeight: '900' },
  legendText: { color: '#6f7f94', fontSize: 9 },
  guidance: { maxWidth: 420, color: '#94a2b5', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 12, minHeight: 35 },
  controlArea: { width: '100%', maxWidth: 440, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 8 },
  dpad: { width: 156, height: 156, position: 'relative' },
  moveButton: { position: 'absolute', width: 48, height: 48, backgroundColor: '#111c2c', borderWidth: 1, borderColor: '#35465e', alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  moveText: { color: '#d5dce6', fontSize: 22 },
  up: { left: 54, top: 0 },
  left: { left: 2, top: 54 },
  wait: { left: 54, top: 54 },
  right: { right: 2, top: 54 },
  down: { left: 54, top: 108 },
  waitButton: { backgroundColor: '#251d32', borderColor: '#73569a' },
  waitText: { color: '#b990eb' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  actionColumn: { flex: 1, maxWidth: 235, gap: 10 },
  echoButton: { minHeight: 58, backgroundColor: '#10272b', borderWidth: 1, borderColor: '#3b9692', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 3 },
  echoButtonIcon: { color: '#5de4de', fontSize: 29 },
  echoButtonTitle: { color: '#d9f3f1', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  echoButtonSub: { color: '#65918f', fontSize: 9, marginTop: 3 },
  disabled: { opacity: 0.3 },
  resetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resetText: { color: '#718096', fontSize: 9, textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(1,3,8,0.93)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  briefingCard: { width: '100%', maxWidth: 430, backgroundColor: '#0d1726', borderWidth: 1, borderColor: '#3a4b64', padding: 26, alignItems: 'center' },
  modalIndex: { color: '#5ddbd5', fontSize: 9, fontWeight: '900', letterSpacing: 2.8, textAlign: 'center' },
  modalRune: { color: '#a980dd', fontSize: 34, letterSpacing: 8, marginVertical: 20 },
  modalTitle: { color: '#f3ebde', fontSize: 27, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: '#9679bc', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  briefingRule: { width: '100%', borderLeftWidth: 2, borderLeftColor: '#d4a757', backgroundColor: '#111d2c', padding: 15, marginVertical: 22 },
  briefingRuleText: { color: '#aab6c5', fontSize: 13, lineHeight: 20 },
  briefingMeta: { color: '#66778d', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 22 },
  failureCard: { width: '100%', maxWidth: 410, backgroundColor: '#17131c', borderWidth: 1, borderColor: '#754052', padding: 28, alignItems: 'center' },
  failureIcon: { color: '#df6678', fontSize: 55, marginBottom: 14 },
  failureText: { color: '#ad929a', fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: 22 },
  completeCard: { width: '100%', maxWidth: 430, backgroundColor: '#0d1726', borderWidth: 1, borderColor: '#8f713d', padding: 28, alignItems: 'center' },
  completeText: { color: '#8e9eb3', fontSize: 12, lineHeight: 18, textAlign: 'center', marginVertical: 24 },
  sealRune: { color: '#e1b45e', fontSize: 48, marginVertical: 15, textShadowColor: '#dca84c', textShadowRadius: 12 },
  victoryCard: { width: '100%', maxWidth: 430, backgroundColor: '#0d1726', borderWidth: 1, borderColor: '#92733c', padding: 28, alignItems: 'center' },
  victoryEchoes: { color: '#6edbd5', fontSize: 28, letterSpacing: 5, marginBottom: 18 },
  victoryTitle: { color: '#f3ebde', fontSize: 28, lineHeight: 35, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  victoryText: { color: '#8f9db0', fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: 24 },
});
