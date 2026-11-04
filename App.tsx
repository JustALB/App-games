import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
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
  tileAt,
  turnLimit,
} from './src/game';

type Phase = 'intro' | 'briefing' | 'playing' | 'complete' | 'victory';

const echoColors = ['#5de4de', '#b68cff', '#f08baf'];

export default function App() {
  const { width, height } = useWindowDimensions();
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [game, setGame] = useState(() => createInitialState(0));
  const boardShake = useRef(new Animated.Value(0)).current;

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
  const nextPlates = getActivePlates(game, game.player, game.turn + 1);
  const lockedGateNearby = [
    { row: game.player.row - 1, col: game.player.col },
    { row: game.player.row + 1, col: game.player.col },
    { row: game.player.row, col: game.player.col - 1 },
    { row: game.player.row, col: game.player.col + 1 },
  ].some((point) => {
    const tile = tileAt(game.chamber, point);
    if (tile === 'A') return !nextPlates.has('a');
    if (tile === 'X') return !nextPlates.has('a') || !nextPlates.has('b');
    if (tile === 'Z') return !nextPlates.has('a') || !nextPlates.has('b') || !nextPlates.has('c');
    return false;
  });

  const startGame = () => {
    setGame(createInitialState(selectedLevel));
    setPhase('briefing');
  };

  const perform = (action: Action) => {
    const next = step(game, action);
    if (next === game) {
      boardShake.setValue(0);
      Animated.sequence([
        Animated.timing(boardShake, { toValue: 5, duration: 45, useNativeDriver: true }),
        Animated.timing(boardShake, { toValue: -4, duration: 55, useNativeDriver: true }),
        Animated.timing(boardShake, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]).start();
      return;
    }
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
    <ImageBackground source={require('./assets/archive-background.png')} style={styles.root} resizeMode="cover">
      <LinearGradient colors={['rgba(2,6,12,0.78)', 'rgba(5,14,26,0.72)', 'rgba(3,6,13,0.88)']} style={styles.root}>
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

            <Animated.View style={[styles.boardShell, { transform: [{ translateX: boardShake }] }]}>
              <View style={styles.boardHeader}>
                <Text style={styles.boardHeaderText}>⌁ ZEITARCHIV · KAMMER {String(game.chamber.id).padStart(2, '0')}</Text>
                <Text style={styles.boardHeaderRune}>✦</Text>
              </View>
              <View style={[styles.board, { width: cellSize * game.chamber.map[0].length }]}>
                {game.chamber.map.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.boardRow}>
                    {[...row].map((tile, colIndex) => {
                      const point = { row: rowIndex, col: colIndex };
                      const key = pointKey(point);
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
                        </View>
                      );
                    })}
                  </View>
                ))}
                {echoPositions.map((position, index) => (
                  <MovingEntity key={`echo-${index}`} point={position} cellSize={cellSize} color={echoColors[index]} echo />
                ))}
                <MovingEntity point={game.player} cellSize={cellSize} color="#ffd67f" />
              </View>
            </Animated.View>

            <View style={styles.legend}>
              <Legend symbol="◇" text="Echo" color={echoColors[0]} />
              <Legend symbol="◉" text="Platte" color="#d5a95f" />
              <Legend symbol="╳" text="Bruch" color="#cc7b65" />
              <Legend symbol="△" text="Impuls" color="#e87878" />
              <Legend symbol="▥" text="Takttor" color="#b68cff" />
            </View>

            <Text style={[styles.guidance, lockedGateNearby && styles.syncGuidance]}>
              {timeExpired
                ? 'Kein Zug bleibt übrig. Kürzere Echo-Wege geben der finalen Zeitlinie mehr Raum.'
                : lockedGateNearby
                  ? game.chamber.allowWait
                    ? 'TOR WARTET AUF EIN ECHO · Nutze ⧖ oder bewege dich, um die gemeinsame Zeit voranzutreiben.'
                    : 'TOR WARTET AUF EIN ECHO · Stillstand ist gesperrt. Nutze eine Seitennische oder gehe kurz zurück.'
                  : game.chamber.lesson}
            </Text>

            <View style={styles.controlArea}>
              <View style={styles.dpad}>
                <MoveButton label="↑" onPress={() => perform('up')} style={styles.up} />
                <MoveButton label="←" onPress={() => perform('left')} style={styles.left} />
                <MoveButton label={game.chamber.allowWait ? '⧖' : '×'} onPress={() => perform('wait')} style={styles.wait} special disabled={!game.chamber.allowWait} />
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
            <Text style={styles.briefingMeta}>{game.chamber.memoryBudget} GESAMTZÜGE · {game.chamber.maxEchoes} {game.chamber.maxEchoes === 1 ? 'ECHO' : 'ECHOS'}{game.chamber.echoCycleLength ? ` · ${game.chamber.echoCycleLength}ER RÜCKLAUF` : ''}{game.chamber.allowWait ? '' : ' · KEIN STILLSTAND'}</Text>
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
    </ImageBackground>
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

function MoveButton({ label, onPress, style, special = false, disabled = false }: { label: string; onPress: () => void; style: object; special?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={special ? 'Zeit abwarten' : `Bewegen ${label}`} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.moveButton, style, special && styles.waitButton, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.moveText, special && styles.waitText]}>{label}</Text></Pressable>;
}

function MovingEntity({ point, cellSize, color, echo = false }: { point: { row: number; col: number }; cellSize: number; color: string; echo?: boolean }) {
  const position = useRef(new Animated.ValueXY({ x: point.col * cellSize, y: point.row * cellSize })).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: { x: point.col * cellSize, y: point.row * cellSize },
      speed: 28,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, [cellSize, point.col, point.row, position]);

  return (
    <Animated.View pointerEvents="none" style={[styles.movingEntity, { width: cellSize, height: cellSize, transform: position.getTranslateTransform() }]}>
      <View style={[echo ? styles.entityAura : styles.playerAura, echo && { borderColor: color }]} />
      <Text style={[echo ? styles.echoPlayer : styles.player, { color }]}>{echo ? '◇' : '◆'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03060c' },
  full: { flex: 1 },
  glow: { position: 'absolute', width: 330, height: 330, borderRadius: 999, opacity: 0.13 },
  glowCyan: { backgroundColor: '#22d7df', top: -190, right: -110 },
  glowViolet: { backgroundColor: '#925ce8', bottom: -190, left: -120 },
  intro: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 26 },
  echoMark: { width: 150, height: 82, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  echoRune: { position: 'absolute', fontSize: 70, opacity: 0.68, textShadowColor: '#65e7e3', textShadowRadius: 22 },
  echoCore: { color: '#ffd47f', fontSize: 48, textShadowColor: '#f1a93f', textShadowRadius: 24 },
  eyebrow: { color: '#79f2ec', fontSize: 10, fontWeight: '900', letterSpacing: 4, textShadowColor: '#1fbdb8', textShadowRadius: 8 },
  logo: { color: '#fff7e8', fontSize: 54, lineHeight: 49, fontWeight: '900', letterSpacing: 8, textAlign: 'center', marginTop: 11, textShadowColor: '#000', textShadowRadius: 14 },
  tagline: { color: '#c2ccda', fontSize: 15, lineHeight: 23, maxWidth: 360, textAlign: 'center', marginTop: 18, textShadowColor: '#02050a', textShadowRadius: 8 },
  levelPicker: { width: '100%', maxWidth: 410, minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(113,217,219,0.38)', backgroundColor: 'rgba(6,17,30,0.84)', marginTop: 22, borderRadius: 14, overflow: 'hidden', shadowColor: '#37d7d1', shadowOpacity: 0.16, shadowRadius: 16 },
  pickerButton: { width: 54, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(27,52,72,0.7)' },
  pickerArrow: { color: '#6edbd5', fontSize: 30, lineHeight: 32 },
  pickerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  pickerIndex: { color: '#b58aee', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  pickerName: { color: '#fff2da', fontSize: 13, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  featureLine: { width: '100%', maxWidth: 430, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(129,154,187,0.25)', backgroundColor: 'rgba(4,12,22,0.38)', marginVertical: 22, paddingVertical: 15 },
  feature: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  featureNumber: { color: '#b58aee', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  featureText: { color: '#aab7c9', fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 7 },
  primaryButton: { width: '100%', maxWidth: 410, minHeight: 60, backgroundColor: '#e7b65e', borderWidth: 1, borderColor: '#ffda8c', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#f0b852', shadowOpacity: 0.38, shadowRadius: 22, elevation: 8 },
  primaryText: { color: '#10131b', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
  primaryArrow: { position: 'absolute', right: 21, color: '#10131b', fontSize: 20 },
  gameScreen: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 30 },
  header: { width: '100%', maxWidth: 450, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  chapter: { color: '#6fe7e1', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, textShadowColor: '#167c7b', textShadowRadius: 6 },
  title: { color: '#fff4e2', fontSize: 21, fontWeight: '900', marginTop: 4, textShadowColor: '#020407', textShadowRadius: 8 },
  smallButton: { width: 40, height: 40, borderWidth: 1, borderColor: 'rgba(115,164,190,0.45)', backgroundColor: 'rgba(7,17,29,0.78)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: '#b4c5d8', fontSize: 23 },
  timelineCard: { width: '100%', maxWidth: 450, backgroundColor: 'rgba(4,13,24,0.48)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(96,166,192,0.32)', paddingHorizontal: 8, paddingVertical: 12, marginBottom: 8 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineLabel: { color: '#77889d', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  turnCount: { color: '#d5ac67', fontSize: 12, fontWeight: '900' },
  timeline: { flexDirection: 'row', gap: 3, marginVertical: 9 },
  tick: { height: 4, flex: 1, backgroundColor: '#1c2d43', borderRadius: 4 },
  tickPast: { backgroundColor: '#46c9c2' },
  tickNow: { backgroundColor: '#ffd378', height: 8, marginTop: -2, shadowColor: '#ffc45f', shadowOpacity: 0.8, shadowRadius: 6 },
  echoStatusRow: { flexDirection: 'row', gap: 18 },
  echoStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  echoDot: { width: 8, height: 8, borderRadius: 8, borderWidth: 1 },
  echoStatusText: { color: '#66778c', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  memoryRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1d2c40', marginTop: 9, paddingTop: 8 },
  memoryLabel: { color: '#697b90', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  memoryValue: { color: '#f0c56e', fontSize: 10, fontWeight: '900' },
  boardShell: { alignItems: 'center', backgroundColor: 'transparent', shadowColor: '#45dcd5', shadowOpacity: 0.16, shadowRadius: 22, elevation: 5 },
  boardHeader: { width: '100%', height: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 },
  boardHeaderText: { color: '#7895a9', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  boardHeaderRune: { color: '#e9b960', fontSize: 13, textShadowColor: '#e9a943', textShadowRadius: 8 },
  board: { backgroundColor: 'transparent', overflow: 'hidden', position: 'relative' },
  boardRow: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  floor: { backgroundColor: 'rgba(8,31,43,0.94)', shadowColor: '#4bc9cf', shadowOpacity: 0.18, shadowRadius: 4 },
  wall: { backgroundColor: 'transparent' },
  plate: { backgroundColor: 'rgba(77,57,21,0.96)', borderColor: '#e7b458', borderWidth: 1.4, shadowColor: '#efb950', shadowOpacity: 0.65, shadowRadius: 7, elevation: 4 },
  gate: { backgroundColor: 'rgba(67,28,39,0.96)', borderColor: '#d37574', borderWidth: 1.4, shadowColor: '#d85d70', shadowOpacity: 0.45, shadowRadius: 6 },
  openGate: { backgroundColor: 'rgba(12,61,57,0.86)', borderColor: '#55e0cf', borderWidth: 1.2, shadowColor: '#42dfcf', shadowOpacity: 0.55, shadowRadius: 7 },
  fragile: { backgroundColor: 'rgba(59,28,33,0.92)', borderColor: '#d77a69', borderWidth: 1.2 },
  collapsed: { backgroundColor: 'rgba(2,3,6,0.86)', borderColor: '#0b0d12' },
  pulseHot: { backgroundColor: 'rgba(83,24,43,0.96)', borderColor: '#ff657e', borderWidth: 1.3, shadowColor: '#ff466b', shadowOpacity: 0.7, shadowRadius: 7 },
  pulseSafe: { backgroundColor: 'rgba(16,55,61,0.94)', borderColor: '#58bac0', borderWidth: 1.2 },
  exit: { backgroundColor: 'rgba(83,62,21,0.96)', borderColor: '#ffd16e', borderWidth: 1.5, shadowColor: '#ffd16e', shadowOpacity: 0.85, shadowRadius: 10, elevation: 5 },
  tileSymbol: { color: '#afc0d2', fontSize: 15, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 3 },
  movingEntity: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  playerAura: { position: 'absolute', width: 25, height: 25, borderRadius: 20, backgroundColor: 'rgba(255,196,86,0.18)', borderWidth: 1, borderColor: 'rgba(255,214,128,0.55)', shadowColor: '#ffc55f', shadowOpacity: 0.9, shadowRadius: 10 },
  player: { color: '#ffe09a', fontSize: 19, textShadowColor: '#f5ac36', textShadowRadius: 12 },
  entityAura: { position: 'absolute', width: 24, height: 24, borderRadius: 20, borderWidth: 1, opacity: 0.55 },
  echoPlayer: { fontSize: 21, fontWeight: '900', textShadowColor: '#62ddd7', textShadowRadius: 10 },
  danger: { color: '#f07777' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: 420, justifyContent: 'center', gap: 6, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5, paddingVertical: 3 },
  legendSymbol: { fontSize: 14, fontWeight: '900' },
  legendText: { color: '#6f7f94', fontSize: 9 },
  guidance: { width: '100%', maxWidth: 420, color: '#b8c4d3', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 10, minHeight: 43, paddingHorizontal: 12, paddingVertical: 7, textShadowColor: '#010308', textShadowRadius: 5 },
  syncGuidance: { color: '#e2bd79', fontWeight: '800' },
  controlArea: { width: '100%', maxWidth: 440, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 8 },
  dpad: { width: 156, height: 156, position: 'relative' },
  moveButton: { position: 'absolute', width: 48, height: 48, backgroundColor: 'rgba(14,30,47,0.94)', borderWidth: 1, borderColor: '#4a6885', alignItems: 'center', justifyContent: 'center', borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 7, elevation: 4 },
  moveText: { color: '#d5dce6', fontSize: 22 },
  up: { left: 54, top: 0 },
  left: { left: 2, top: 54 },
  wait: { left: 54, top: 54 },
  right: { right: 2, top: 54 },
  down: { left: 54, top: 108 },
  waitButton: { backgroundColor: 'rgba(47,30,65,0.95)', borderColor: '#976bc4' },
  waitText: { color: '#b990eb' },
  pressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  actionColumn: { flex: 1, maxWidth: 235, gap: 10 },
  echoButton: { minHeight: 62, backgroundColor: 'rgba(11,48,52,0.94)', borderWidth: 1, borderColor: '#47bdb7', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 14, shadowColor: '#46d7d0', shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 },
  echoButtonIcon: { color: '#5de4de', fontSize: 29 },
  echoButtonTitle: { color: '#d9f3f1', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  echoButtonSub: { color: '#65918f', fontSize: 9, marginTop: 3 },
  disabled: { opacity: 0.3 },
  resetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resetText: { color: '#91a6bd', fontSize: 9, textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(1,4,10,0.84)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  briefingCard: { width: '100%', maxWidth: 430, backgroundColor: 'rgba(7,18,31,0.97)', borderWidth: 1, borderColor: 'rgba(99,188,199,0.52)', borderRadius: 18, padding: 26, alignItems: 'center', shadowColor: '#4bdad4', shadowOpacity: 0.22, shadowRadius: 24, elevation: 10 },
  modalIndex: { color: '#5ddbd5', fontSize: 9, fontWeight: '900', letterSpacing: 2.8, textAlign: 'center' },
  modalRune: { color: '#a980dd', fontSize: 34, letterSpacing: 8, marginVertical: 20 },
  modalTitle: { color: '#f3ebde', fontSize: 27, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: '#9679bc', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  briefingRule: { width: '100%', borderLeftWidth: 3, borderLeftColor: '#e7b65e', backgroundColor: 'rgba(18,35,53,0.85)', borderRadius: 9, padding: 15, marginVertical: 22 },
  briefingRuleText: { color: '#aab6c5', fontSize: 13, lineHeight: 20 },
  briefingMeta: { color: '#66778d', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 22 },
  failureCard: { width: '100%', maxWidth: 410, backgroundColor: 'rgba(30,15,26,0.97)', borderWidth: 1, borderColor: '#9b4b65', borderRadius: 18, padding: 28, alignItems: 'center' },
  failureIcon: { color: '#df6678', fontSize: 55, marginBottom: 14 },
  failureText: { color: '#ad929a', fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: 22 },
  completeCard: { width: '100%', maxWidth: 430, backgroundColor: 'rgba(8,20,32,0.97)', borderWidth: 1, borderColor: '#b38a42', borderRadius: 18, padding: 28, alignItems: 'center', shadowColor: '#e6b65a', shadowOpacity: 0.24, shadowRadius: 24 },
  completeText: { color: '#8e9eb3', fontSize: 12, lineHeight: 18, textAlign: 'center', marginVertical: 24 },
  sealRune: { color: '#e1b45e', fontSize: 48, marginVertical: 15, textShadowColor: '#dca84c', textShadowRadius: 12 },
  victoryCard: { width: '100%', maxWidth: 430, backgroundColor: 'rgba(8,20,32,0.97)', borderWidth: 1, borderColor: '#b88d45', borderRadius: 18, padding: 28, alignItems: 'center', shadowColor: '#e6b65a', shadowOpacity: 0.25, shadowRadius: 24 },
  victoryEchoes: { color: '#6edbd5', fontSize: 28, letterSpacing: 5, marginBottom: 18 },
  victoryTitle: { color: '#f3ebde', fontSize: 28, lineHeight: 35, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  victoryText: { color: '#8f9db0', fontSize: 13, lineHeight: 20, textAlign: 'center', marginVertical: 24 },
});
