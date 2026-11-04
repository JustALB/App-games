export type Point = { row: number; col: number };
export type Cell = 'wall' | 'path' | 'puzzle' | 'exit';

export type Maze = {
  cells: Cell[][];
  rows: number;
  cols: number;
  start: Point;
  exit: Point;
  puzzleKeys: string[];
};

export type Puzzle = {
  category: 'ZAHLEN' | 'MUSTER' | 'LOGIK';
  prompt: string;
  options: string[];
  answer: string;
  hint: string;
};

export const pointKey = ({ row, col }: Point) => `${row}:${col}`;

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T,>(items: T[], random: () => number) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
};

const neighbors = ({ row, col }: Point, rows: number, cols: number) =>
  [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ].filter((point) => point.row >= 0 && point.col >= 0 && point.row < rows && point.col < cols);

export function findPath(cells: Cell[][], start: Point, target: Point): Point[] {
  const queue = [start];
  const previous = new Map<string, Point | null>([[pointKey(start), null]]);
  while (queue.length) {
    const current = queue.shift()!;
    if (pointKey(current) === pointKey(target)) break;
    for (const next of neighbors(current, cells.length, cells[0].length)) {
      const key = pointKey(next);
      if (cells[next.row][next.col] !== 'wall' && !previous.has(key)) {
        previous.set(key, current);
        queue.push(next);
      }
    }
  }
  if (!previous.has(pointKey(target))) return [];
  const path: Point[] = [];
  let cursor: Point | null = target;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(pointKey(cursor)) ?? null;
  }
  return path;
}

export function generateMaze(seed: number, rows = 15, cols = 11): Maze {
  const safeRows = rows % 2 === 0 ? rows - 1 : rows;
  const safeCols = cols % 2 === 0 ? cols - 1 : cols;
  const random = mulberry32(seed);
  const cells: Cell[][] = Array.from({ length: safeRows }, () => Array<Cell>(safeCols).fill('wall'));
  const start = { row: 1, col: 1 };
  const stack = [start];
  cells[start.row][start.col] = 'path';

  while (stack.length) {
    const current = stack[stack.length - 1];
    const candidates = shuffle(
      [
        { row: current.row - 2, col: current.col },
        { row: current.row + 2, col: current.col },
        { row: current.row, col: current.col - 2 },
        { row: current.row, col: current.col + 2 },
      ].filter(
        (point) =>
          point.row > 0 && point.col > 0 && point.row < safeRows - 1 && point.col < safeCols - 1 && cells[point.row][point.col] === 'wall',
      ),
      random,
    );
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const next = candidates[0];
    cells[(current.row + next.row) / 2][(current.col + next.col) / 2] = 'path';
    cells[next.row][next.col] = 'path';
    stack.push(next);
  }

  let exit = start;
  let longestPath: Point[] = [start];
  for (let row = 1; row < safeRows; row += 1) {
    for (let col = 1; col < safeCols; col += 1) {
      if (cells[row][col] === 'wall') continue;
      const path = findPath(cells, start, { row, col });
      if (path.length > longestPath.length) {
        longestPath = path;
        exit = { row, col };
      }
    }
  }

  cells[exit.row][exit.col] = 'exit';
  const puzzleIndexes = [0.27, 0.52, 0.76].map((ratio) =>
    Math.max(2, Math.min(longestPath.length - 2, Math.floor(longestPath.length * ratio))),
  );
  const puzzleKeys = [...new Set(puzzleIndexes)].map((index) => {
    const point = longestPath[index];
    cells[point.row][point.col] = 'puzzle';
    return pointKey(point);
  });
  return { cells, rows: safeRows, cols: safeCols, start, exit, puzzleKeys };
}

const numberOptions = (answer: number, random: () => number) => {
  const values = new Set([answer]);
  while (values.size < 4) {
    const offset = Math.floor(random() * 9) - 4;
    if (offset !== 0 && answer + offset >= 0) values.add(answer + offset);
  }
  return shuffle([...values].map(String), random);
};

export function createPuzzle(seed: number): Puzzle {
  const random = mulberry32(seed);
  const kind = Math.floor(random() * 3);
  if (kind === 0) {
    const left = 4 + Math.floor(random() * 18);
    const right = 2 + Math.floor(random() * 9);
    const multiply = random() > 0.55;
    const answer = multiply ? left * right : left + right;
    return {
      category: 'ZAHLEN',
      prompt: multiply ? `${left} × ${right} = ?` : `${left} + ${right} = ?`,
      options: numberOptions(answer, random),
      answer: String(answer),
      hint: multiply ? `Zerlege ${left} in kleinere Teile.` : 'Addiere zuerst die Einerstellen.',
    };
  }
  if (kind === 1) {
    const start = 1 + Math.floor(random() * 8);
    const step = 2 + Math.floor(random() * 7);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const answer = start + step * 4;
    return {
      category: 'MUSTER',
      prompt: `${sequence.join('  ·  ')}  ·  ?`,
      options: numberOptions(answer, random),
      answer: String(answer),
      hint: 'Der Abstand zwischen zwei Zahlen bleibt gleich.',
    };
  }
  const riddles = [
    { prompt: 'Du überholst im Rennen die Person auf Platz 2. Auf welchem Platz bist du?', options: ['1', '2', '3', 'Letzter'], answer: '2', hint: 'Du nimmst genau den Platz der überholten Person ein.' },
    { prompt: 'Was wird nasser, während es trocknet?', options: ['Ein Handtuch', 'Die Sonne', 'Sand', 'Feuer'], answer: 'Ein Handtuch', hint: 'Es nimmt das Wasser von etwas anderem auf.' },
    { prompt: 'Alle Ruun sind blau. Dieses Wesen ist ein Ruun. Welche Aussage stimmt sicher?', options: ['Es ist blau', 'Es kann fliegen', 'Es ist klein', 'Nichts davon'], answer: 'Es ist blau', hint: 'Nutze nur die zwei Informationen aus der Frage.' },
    { prompt: 'Welche Form hat keine Ecke?', options: ['Kreis', 'Dreieck', 'Quadrat', 'Stern'], answer: 'Kreis', hint: 'Ihre Linie hat weder Anfang noch Ende.' },
  ];
  const selected = riddles[Math.floor(random() * riddles.length)];
  return { category: 'LOGIK', ...selected, options: shuffle(selected.options, random) };
}
