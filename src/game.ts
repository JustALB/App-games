export type Point = { row: number; col: number };
export type Action = 'up' | 'down' | 'left' | 'right' | 'wait';
export type Tile = '#' | '.' | 'S' | 'E' | 'a' | 'b' | 'c' | 'A' | 'X' | 'Z' | '~' | '^' | 'Q';
export type RunStatus = 'playing' | 'fallen' | 'complete';

export type Chamber = {
  id: number;
  name: string;
  subtitle: string;
  lesson: string;
  tier: string;
  map: string[];
  maxTurns: number;
  maxEchoes: number;
  memoryBudget: number;
  optimalMemory: number;
  start: Point;
  solution: Action[][];
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

type ChamberSpec = {
  id: number;
  name: string;
  echoes: 1 | 2 | 3;
  width: number;
  directions: Array<-1 | 1>;
  branchLengths: number[];
  hazards: Array<'~' | '^' | 'Q'>;
  decoys: number;
  memorySlack: number;
};

const DELTAS: Record<Action, Point> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
  wait: { row: 0, col: 0 },
};

const ACTIONS: Action[] = ['up', 'left', 'right', 'down', 'wait'];
const PLATES: Tile[] = ['a', 'b', 'c'];
const GATES: Tile[] = ['A', 'X', 'Z'];

export const pointKey = ({ row, col }: Point) => `${row}:${col}`;
export const samePoint = (left: Point, right: Point) => left.row === right.row && left.col === right.col;

export function tileAt(chamber: Chamber, point: Point): Tile {
  return (chamber.map[point.row]?.[point.col] ?? '#') as Tile;
}

const createStateForChamber = (chamber: Chamber): GameState => ({
  chamber,
  player: chamber.start,
  echoes: [],
  recording: [chamber.start],
  turn: 0,
  collapsed: new Set(),
  status: 'playing',
  failureReason: null,
});

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
  if (gateRequirements(targetTile).some((plate) => !activePlates.has(plate))) return state;
  if (targetTile === 'Q' && isPulseActive(nextTurn)) return state;

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
  return {
    ...state,
    player: target,
    recording: [...state.recording, target],
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

const solverKey = (state: GameState) =>
  `${pointKey(state.player)}|${state.turn}|${[...state.collapsed].sort().join(',')}`;

const findRoute = (initial: GameState, targetTile: Tile) => {
  const queue: Array<{ state: GameState; actions: Action[] }> = [{ state: initial, actions: [] }];
  const seen = new Set([solverKey(initial)]);
  while (queue.length) {
    const current = queue.shift()!;
    if (tileAt(current.state.chamber, current.state.player) === targetTile) return current;
    for (const action of ACTIONS) {
      const next = step(current.state, action);
      if (next === current.state || next.status === 'fallen') continue;
      if (next.status === 'complete' && targetTile !== 'E') continue;
      const key = solverKey(next);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ state: next, actions: [...current.actions, action] });
      }
    }
  }
  throw new Error(`No route to ${targetTile} in chamber ${initial.chamber.id}`);
};

const solveChamber = (chamber: Chamber) => {
  let state = createStateForChamber(chamber);
  const solution: Action[][] = [];
  for (const plate of PLATES.slice(0, chamber.maxEchoes)) {
    const route = findRoute(state, plate);
    solution.push(route.actions);
    state = recordEcho(route.state);
  }
  const exitRoute = findRoute(state, 'E');
  solution.push(exitRoute.actions);
  return { solution, optimalMemory: memoryUsed(exitRoute.state) };
};

const levelNames = [
  'Der erste Abdruck', 'Die schmale Erinnerung', 'Der wartende Schritt', 'Das flackernde Tor', 'Der brüchige Schwur',
  'Die verlorene Sekunde', 'Zwei Wege, ein Gedanke', 'Die versetzte Platte', 'Der doppelte Atem', 'Das Echo im Seitenraum',
  'Der Takt der Mauern', 'Die geteilte Spur', 'Das fragile Versprechen', 'Zwei Schatten voraus', 'Das Tor ohne Gegenwart',
  'Die gekreuzte Erinnerung', 'Der knappe Augenblick', 'Das letzte Doppelbild', 'Drei Stimmen im Stein', 'Die Kette der Vergangenheit',
  'Das dritte Gewicht', 'Der wandernde Takt', 'Die brüchige Chronik', 'Drei Wege, kein Zurück', 'Das Paradox der Platten',
  'Die enge Erinnerung', 'Der Puls des Archivs', 'Die vollständige Kette', 'Der letzte Zeitknoten', 'Das Herz des Echos',
];

const hazardPatterns: Array<Array<'~' | '^' | 'Q'>> = [
  [], ['~'], ['^'], ['Q'], ['~', '^'], ['Q', '~'], ['^', 'Q'], ['~', 'Q', '^'],
];

const createSpec = (name: string, index: number): ChamberSpec => {
  const id = index + 1;
  const echoes: 1 | 2 | 3 = id <= 6 ? 1 : id <= 18 ? 2 : 3;
  const width = [11, 13, 15][id % 3];
  const maxLength = Math.min(4, Math.floor(width / 2) - 1);
  const directions = Array.from({ length: echoes }, (_, echoIndex) => ((id + echoIndex) % 2 ? -1 : 1) as -1 | 1);
  const branchLengths = Array.from({ length: echoes }, (_, echoIndex) => 2 + ((id + echoIndex * 2) % (maxLength - 1)));
  const hazardCountBoost = id >= 25 ? 2 : id >= 13 ? 1 : 0;
  const pattern = hazardPatterns[(id + hazardCountBoost) % hazardPatterns.length];
  const memorySlack = id >= 27 ? 0 : id >= 19 ? 1 : id >= 10 ? 2 : 4;
  return {
    id,
    name,
    echoes,
    width,
    directions,
    branchLengths,
    hazards: pattern.slice(0, Math.min(pattern.length, 1 + Math.floor(id / 8))),
    decoys: Math.min(2, Math.floor((id - 1) / 10)),
    memorySlack,
  };
};

const buildChamber = (spec: ChamberSpec): Chamber => {
  const rows = spec.echoes === 1 ? 9 : spec.echoes === 2 ? 13 : 15;
  const center = Math.floor(spec.width / 2);
  const start = { row: rows - 2, col: center };
  const grid = Array.from({ length: rows }, () => Array(spec.width).fill('#'));

  for (let row = 1; row <= start.row; row += 1) grid[row][center] = '.';
  const plateRows: number[] = [];
  const gateRows: number[] = [];
  for (let index = 0; index < spec.echoes; index += 1) {
    const plateRow = start.row - 1 - index * 3;
    const gateRow = start.row - 3 - index * 3;
    plateRows.push(plateRow);
    gateRows.push(gateRow);
    const direction = spec.directions[index];
    const length = spec.branchLengths[index];
    for (let offset = 1; offset <= length; offset += 1) grid[plateRow][center + direction * offset] = '.';
    grid[plateRow][center + direction * length] = PLATES[index];
    grid[gateRow][center] = GATES[index];
  }

  const reservedRows = new Set([...plateRows, ...gateRows, 1, start.row]);
  const hazardRows = Array.from({ length: start.row - 2 }, (_, index) => start.row - 1 - index)
    .filter((row) => row > 1 && !reservedRows.has(row));
  spec.hazards.forEach((hazard, index) => {
    const row = hazardRows[(spec.id + index * 2) % hazardRows.length];
    grid[row][center] = hazard;
  });

  const decoyRows = hazardRows.filter((row) => grid[row][center] === '.');
  for (let index = 0; index < spec.decoys && index < decoyRows.length; index += 1) {
    const row = decoyRows[(spec.id + index) % decoyRows.length];
    const direction = ((spec.id + index) % 2 ? -1 : 1);
    for (let offset = 1; offset <= 2; offset += 1) grid[row][center + direction * offset] = '.';
  }

  grid[start.row][start.col] = 'S';
  grid[1][center] = 'E';
  const tier = spec.echoes === 1 ? 'ERINNERUNG' : spec.echoes === 2 ? 'SYNCHRONISATION' : 'PARADOXON';
  const hazardText = spec.hazards.length ? ' Taktfelder und brüchige Schritte verändern die kürzeste Route.' : '';
  const base: Chamber = {
    id: spec.id,
    name: spec.name,
    subtitle: spec.echoes === 1 ? 'Eine Spur formt den Weg.' : spec.echoes === 2 ? 'Die zweite Spur braucht die erste.' : 'Jede Vergangenheit öffnet die nächste.',
    lesson: `${spec.echoes === 1 ? 'Platziere dein Echo auf Platte Ⅰ.' : `Baue die Torkette ${PLATES.slice(0, spec.echoes).map((_, i) => ['Ⅰ', 'Ⅱ', 'Ⅲ'][i]).join(' → ')} in der richtigen Reihenfolge.`}${hazardText}`,
    tier,
    map: grid.map((row) => row.join('')),
    maxTurns: 50,
    maxEchoes: spec.echoes,
    memoryBudget: 999,
    optimalMemory: 0,
    start,
    solution: [],
  };
  const solved = solveChamber(base);
  const longestTimeline = Math.max(...solved.solution.map((actions) => actions.length));
  return {
    ...base,
    maxTurns: longestTimeline + Math.min(3, spec.memorySlack),
    memoryBudget: solved.optimalMemory + spec.memorySlack,
    optimalMemory: solved.optimalMemory,
    solution: solved.solution,
  };
};

export const CHAMBERS: Chamber[] = levelNames.map((name, index) => buildChamber(createSpec(name, index)));

export function createInitialState(chamberIndex = 0): GameState {
  return createStateForChamber(CHAMBERS[chamberIndex]);
}
