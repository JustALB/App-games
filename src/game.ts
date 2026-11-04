export type Point = { row: number; col: number };
export type Action = 'up' | 'down' | 'left' | 'right' | 'wait';
export type Tile = '#' | '.' | 'S' | 'E' | 'a' | 'b' | 'c' | 'A' | 'X' | 'Z' | '~' | '^';
export type RunStatus = 'playing' | 'fallen' | 'complete';

export type Chamber = {
  id: number;
  name: string;
  subtitle: string;
  lesson: string;
  map: string[];
  maxTurns: number;
  maxEchoes: number;
  memoryBudget: number;
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
    '#....X...E#',
    '#####.#####',
    '#....A..b.#',
    '#####.#####',
    '#a........#',
    '#.........#',
    '#S........#',
    '###########',
  ],
  [
    '#############',
    '#.....Z....E#',
    '######.######',
    '#.....X...c.#',
    '######~######',
    '#.....A..b..#',
    '######^######',
    '#a....~.....#',
    '#...........#',
    '#S..........#',
    '#############',
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
    memoryBudget: 21,
    start: { row: 7, col: 1 },
  },
  {
    id: 2,
    name: 'Das geteilte Bewusstsein',
    subtitle: 'Zwei Vergangenheiten. Eine Gegenwart.',
    lesson: 'Echo 1 muss Platte Ⅰ halten, damit Echo 2 überhaupt Platte Ⅱ erreichen kann. Erst beide zusammen öffnen das Doppeltor.',
    map: MAPS[1],
    maxTurns: 18,
    maxEchoes: 2,
    memoryBudget: 30,
    start: { row: 7, col: 1 },
  },
  {
    id: 3,
    name: 'Der gebrochene Augenblick',
    subtitle: 'Der Boden vergisst keinen Schritt.',
    lesson: 'Jedes Echo öffnet den Weg für das nächste. Baue Ⅰ → Ⅱ → Ⅲ auf und spare genug Erinnerung für deinen finalen Lauf.',
    map: MAPS[2],
    maxTurns: 22,
    maxEchoes: 3,
    memoryBudget: 51,
    start: { row: 9, col: 1 },
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
    if (tile === 'a' || tile === 'b' || tile === 'c') active.add(tile);
  }
  return active;
}

export const isPulseActive = (turn: number) => turn % 2 === 1;

const gateRequirements = (tile: Tile) => {
  if (tile === 'A') return ['a'];
  if (tile === 'X') return ['a', 'b'];
  if (tile === 'Z') return ['a', 'b', 'c'];
  return [];
};

export const memoryUsed = (state: GameState) =>
  state.echoes.reduce((total, path) => total + path.length - 1, 0) + state.turn;

export const turnLimit = (state: GameState) =>
  Math.max(0, Math.min(state.chamber.maxTurns, state.chamber.memoryBudget - memoryUsed({ ...state, turn: 0 })));

export function step(state: GameState, action: Action): GameState {
  if (state.status !== 'playing' || state.turn >= turnLimit(state)) return state;
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
