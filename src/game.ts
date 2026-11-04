export type Point = { row: number; col: number };
export type Action = 'up' | 'down' | 'left' | 'right' | 'wait';
export type Tile = '#' | '.' | 'S' | 'E' | 'a' | 'b' | 'A' | 'X' | '~' | '^';
export type RunStatus = 'playing' | 'fallen' | 'complete';

export type Chamber = {
  id: number;
  name: string;
  subtitle: string;
  lesson: string;
  map: string[];
  maxTurns: number;
  maxEchoes: number;
  start: Point;
};

export type GameState = {
  chamber: Chamber;
  player: Point;
  echoes: Point[][];
  recording: Point[];
  turn: number;
  collapsed: Set<string>;
  status: RunStatus;
  failureReason: string | null;
};

export type SealPuzzle = {
  category: string;
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
};

const MAPS = [
  [
    '###########',
    '#....#...E#',
    '#.##.#.##.#',
    '#....A....#',
    '#####.#####',
    '#..a......#',
    '#.........#',
    '#S........#',
    '###########',
  ],
  [
    '###########',
    '#.......#E#',
    '#.######..#',
    '#.....X...#',
    '######.####',
    '#a...b....#',
    '#.........#',
    '#S........#',
    '###########',
  ],
  [
    '###########',
    '#....X...E#',
    '#####.###.#',
    '#....^....#',
    '#.###~###.#',
    '#a...~...b#',
    '#.###~###.#',
    '#S........#',
    '###########',
  ],
];

export const CHAMBERS: Chamber[] = [
  {
    id: 1,
    name: 'Die erste Erinnerung',
    subtitle: 'Ein Körper reicht nicht aus.',
    lesson: 'Zeichne einen Lauf zur goldenen Platte auf. Dein Echo bleibt dort stehen und hält das Tor offen.',
    map: MAPS[0],
    maxTurns: 18,
    maxEchoes: 1,
    start: { row: 7, col: 1 },
  },
  {
    id: 2,
    name: 'Das geteilte Bewusstsein',
    subtitle: 'Zwei Vergangenheiten. Eine Gegenwart.',
    lesson: 'Das Doppeltor reagiert nur, wenn beide Platten gleichzeitig von zwei verschiedenen Echos gehalten werden.',
    map: MAPS[1],
    maxTurns: 18,
    maxEchoes: 2,
    start: { row: 7, col: 1 },
  },
  {
    id: 3,
    name: 'Der gebrochene Augenblick',
    subtitle: 'Der Boden vergisst keinen Schritt.',
    lesson: 'Halte beide Platten, überquere den brüchigen Pfad nur einmal und betrete das Impulsfeld im richtigen Takt.',
    map: MAPS[2],
    maxTurns: 18,
    maxEchoes: 2,
    start: { row: 7, col: 1 },
  },
];

export const pointKey = ({ row, col }: Point) => `${row}:${col}`;
export const samePoint = (left: Point, right: Point) => left.row === right.row && left.col === right.col;

export function tileAt(chamber: Chamber, point: Point): Tile {
  return (chamber.map[point.row]?.[point.col] ?? '#') as Tile;
}

export function createInitialState(chamberIndex = 0): GameState {
  const chamber = CHAMBERS[chamberIndex];
  return {
    chamber,
    player: chamber.start,
    echoes: [],
    recording: [chamber.start],
    turn: 0,
    collapsed: new Set(),
    status: 'playing',
    failureReason: null,
  };
}

const DELTAS: Record<Action, Point> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
  wait: { row: 0, col: 0 },
};

export function echoPosition(path: Point[], turn: number) {
  return path[Math.min(turn, path.length - 1)];
}

export function getEchoPositions(state: GameState, turn = state.turn) {
  return state.echoes.map((path) => echoPosition(path, turn));
}

export function getActivePlates(state: GameState, player = state.player, turn = state.turn) {
  const active = new Set<string>();
  for (const position of [...getEchoPositions(state, turn), player]) {
    const tile = tileAt(state.chamber, position);
    if (tile === 'a' || tile === 'b') active.add(tile);
  }
  return active;
}

export const isPulseActive = (turn: number) => turn % 2 === 1;

const gateRequirements = (tile: Tile) => {
  if (tile === 'A') return ['a'];
  if (tile === 'X') return ['a', 'b'];
  return [];
};

export function step(state: GameState, action: Action): GameState {
  if (state.status !== 'playing' || state.turn >= state.chamber.maxTurns) return state;
  const delta = DELTAS[action];
  const target = { row: state.player.row + delta.row, col: state.player.col + delta.col };
  const targetTile = tileAt(state.chamber, target);
  if (targetTile === '#') return state;

  const nextTurn = state.turn + 1;
  const activePlates = getActivePlates(state, target, nextTurn);
  const requirements = gateRequirements(targetTile);
  if (requirements.some((plate) => !activePlates.has(plate))) return state;

  if (targetTile === '~' && state.collapsed.has(pointKey(target))) {
    return { ...state, status: 'fallen', failureReason: 'Der bereits gebrochene Boden gibt unter dir nach.' };
  }
  if (targetTile === '^' && isPulseActive(nextTurn)) {
    return { ...state, status: 'fallen', failureReason: 'Der Zeitimpuls trifft dich zwischen zwei Augenblicken.' };
  }

  const collapsed = new Set(state.collapsed);
  if (tileAt(state.chamber, state.player) === '~' && !samePoint(state.player, target)) {
    collapsed.add(pointKey(state.player));
  }
  const recording = [...state.recording, target];
  return {
    ...state,
    player: target,
    recording,
    collapsed,
    turn: nextTurn,
    status: targetTile === 'E' ? 'complete' : 'playing',
    failureReason: null,
  };
}

export function recordEcho(state: GameState): GameState {
  if (state.status !== 'playing' || state.recording.length < 2 || state.echoes.length >= state.chamber.maxEchoes) return state;
  return {
    ...state,
    player: state.chamber.start,
    echoes: [...state.echoes, state.recording],
    recording: [state.chamber.start],
    turn: 0,
    collapsed: new Set(),
    failureReason: null,
  };
}

export function resetLoop(state: GameState, keepEchoes = true): GameState {
  return {
    ...state,
    player: state.chamber.start,
    echoes: keepEchoes ? state.echoes : [],
    recording: [state.chamber.start],
    turn: 0,
    collapsed: new Set(),
    status: 'playing',
    failureReason: null,
  };
}

export function createSealPuzzle(chamberId: number, variant: number): SealPuzzle {
  const variants: Record<number, SealPuzzle[]> = {
    1: [
      { category: 'ZEITLOGIK', prompt: 'Ein Echo erreicht die Platte nach 4 Zügen und bleibt dort. In welchem Zug darfst du das Tor passieren?', options: ['Vor Zug 4', 'Ab Zug 4', 'Nur in Zug 4', 'Nie'], answer: 'Ab Zug 4', hint: 'Ein Echo wiederholt seinen Weg und wartet danach am letzten Ort.' },
      { category: 'ERINNERUNG', prompt: 'Was geschieht mit einem Echo, wenn seine Aufzeichnung endet?', options: ['Es verschwindet', 'Es kehrt um', 'Es bleibt stehen', 'Es wird zur Wand'], answer: 'Es bleibt stehen', hint: 'Darum kann es eine Platte dauerhaft halten.' },
    ],
    2: [
      { category: 'SYNCHRONISATION', prompt: 'Platte A und B müssen gleichzeitig aktiv sein. Wie viele gespeicherte Echos brauchst du mindestens?', options: ['Keins', 'Eins', 'Zwei', 'Vier'], answer: 'Zwei', hint: 'Du selbst musst währenddessen durch das Tor laufen.' },
      { category: 'PARADOXON', prompt: 'Echo A endet nach 2, Echo B nach 6 Zügen. Wann sind beide Platten sicher gleichzeitig aktiv?', options: ['Ab Zug 2', 'Ab Zug 4', 'Ab Zug 6', 'Nur Zug 8'], answer: 'Ab Zug 6', hint: 'Das frühere Echo wartet bereits auf seiner Platte.' },
    ],
    3: [
      { category: 'TAKT', prompt: 'Das Impulsfeld feuert in ungeraden Zügen. Du stehst davor in Zug 7. Wann ist der sichere Schritt?', options: ['Jetzt in Zug 8', 'In Zug 9', 'In Zug 11', 'Nie'], answer: 'Jetzt in Zug 8', hint: 'Gerade Zugzahlen sind sicher.' },
      { category: 'BRUCHLINIE', prompt: 'Ein Bodenfeld zerbricht, sobald du es verlässt. Welche Route ist möglich?', options: ['Hin und zurück', 'Nur einmal vorwärts', 'Beliebig oft', 'Nur rückwärts'], answer: 'Nur einmal vorwärts', hint: 'Plane den Weg, bevor du den ersten Schritt darauf setzt.' },
    ],
  };
  const choices = variants[chamberId];
  return choices[Math.abs(variant) % choices.length];
}
