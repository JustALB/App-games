import assert from 'node:assert/strict';
import test from 'node:test';

import { createPuzzle, findPath, generateMaze, pointKey } from '../src/game.ts';

test('generated mazes always connect start, puzzles, and exit', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const maze = generateMaze(seed);
    const path = findPath(maze.cells, maze.start, maze.exit);
    assert.ok(path.length > 10, `seed ${seed} has a meaningful solution path`);
    assert.equal(maze.puzzleKeys.length, 3);
    const solutionKeys = new Set(path.map(pointKey));
    for (const puzzleKey of maze.puzzleKeys) assert.ok(solutionKeys.has(puzzleKey));
  }
});

test('every generated puzzle has four unique choices and one answer', () => {
  const categories = new Set();
  for (let seed = 1; seed <= 150; seed += 1) {
    const puzzle = createPuzzle(seed);
    categories.add(puzzle.category);
    assert.equal(puzzle.options.length, 4);
    assert.equal(new Set(puzzle.options).size, 4);
    assert.equal(puzzle.options.filter((option) => option === puzzle.answer).length, 1);
  }
  assert.deepEqual(categories, new Set(['ZAHLEN', 'MUSTER', 'LOGIK']));
});
