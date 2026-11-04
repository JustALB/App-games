import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAMBERS,
  createInitialState,
  DEFAULT_ECHO_CYCLE_LENGTH,
  echoPosition,
  getActivePlates,
  isPulseActive,
  memoryUsed,
  recordEcho,
  resetLoop,
  step,
  tileAt,
  turnLimit,
} from '../src/game.ts';

const PLATES = ['a', 'b', 'c'];
const GATES = ['A', 'X', 'Z'];
const play = (state, actions) => actions.reduce((current, action) => step(current, action), state);

const canReach = (chamber, targetTile, blockedTiles = new Set()) => {
  const queue = [chamber.start];
  const seen = new Set([`${chamber.start.row}:${chamber.start.col}`]);
  while (queue.length) {
    const current = queue.shift();
    if (chamber.map[current.row][current.col] === targetTile) return true;
    for (const [rowDelta, colDelta] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const next = { row: current.row + rowDelta, col: current.col + colDelta };
      const tile = chamber.map[next.row]?.[next.col] ?? '#';
      const key = `${next.row}:${next.col}`;
      if (tile !== '#' && !blockedTiles.has(tile) && !seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return false;
};

test('the campaign contains 30 distinct, rectangular chambers', () => {
  assert.equal(CHAMBERS.length, 30);
  assert.equal(new Set(CHAMBERS.map((chamber) => chamber.map.join('\n'))).size, 30);
  for (const chamber of CHAMBERS) {
    assert.ok(chamber.map.every((row) => row.length === chamber.map[0].length), `level ${chamber.id} is rectangular`);
    const flat = chamber.map.join('');
    assert.equal([...flat].filter((tile) => tile === 'S').length, 1, `level ${chamber.id} has one start`);
    assert.equal([...flat].filter((tile) => tile === 'E').length, 1, `level ${chamber.id} has one exit`);
    assert.equal(chamber.solution.length, chamber.maxEchoes + 1);
  }
});

test('the generated optimal solution completes every chamber within budget', () => {
  for (const chamber of CHAMBERS) {
    let state = createInitialState(chamber.id - 1);
    for (let echoIndex = 0; echoIndex < chamber.maxEchoes; echoIndex += 1) {
      const actions = chamber.solution[echoIndex];
      assert.ok(actions.length <= turnLimit(state), `level ${chamber.id} echo ${echoIndex + 1} fits`);
      state = play(state, actions);
      assert.equal(tileAt(chamber, state.player), PLATES[echoIndex], `level ${chamber.id} echo ${echoIndex + 1} reaches its plate`);
      state = recordEcho(state);
    }
    const finalActions = chamber.solution[chamber.maxEchoes];
    assert.ok(finalActions.length <= turnLimit(state), `level ${chamber.id} final run fits`);
    state = play(state, finalActions);
    assert.equal(state.status, 'complete', `level ${chamber.id} completes`);
    assert.equal(memoryUsed(state), chamber.optimalMemory, `level ${chamber.id} optimal memory matches`);
    assert.ok(chamber.memoryBudget >= chamber.optimalMemory);
  }
});

test('all 66 required gate dependencies are structurally impossible to bypass', () => {
  let dependencyCount = 0;
  for (const chamber of CHAMBERS) {
    for (let gateIndex = 0; gateIndex < chamber.maxEchoes; gateIndex += 1) {
      const target = gateIndex + 1 < chamber.maxEchoes ? PLATES[gateIndex + 1] : 'E';
      assert.equal(
        canReach(chamber, target, new Set([GATES[gateIndex]])),
        false,
        `level ${chamber.id}: ${target} cannot bypass ${GATES[gateIndex]}`,
      );
      dependencyCount += 1;
    }
  }
  assert.equal(dependencyCount, 66);
});

test('the campaign contains all hazard and timing variations', () => {
  const campaign = CHAMBERS.map((chamber) => chamber.map.join('')).join('');
  assert.ok(campaign.includes('~'), 'fragile floors exist');
  assert.ok(campaign.includes('^'), 'pulse traps exist');
  assert.ok(campaign.includes('Q'), 'phase gates exist');
  assert.equal(isPulseActive(7), true);
  assert.equal(isPulseActive(8), false);
  assert.equal(CHAMBERS.filter((chamber) => chamber.echoMode === 'cycle').length, 20);
  assert.ok(CHAMBERS.every((chamber) => chamber.maxTurns <= 20), 'each mobile loop stays short');
});

test('cycle echoes rewind together and replay their recorded route', () => {
  const path = [
    { row: 4, col: 2 },
    { row: 3, col: 2 },
    { row: 2, col: 2 },
  ];
  assert.deepEqual(echoPosition(path, DEFAULT_ECHO_CYCLE_LENGTH - 1, 'cycle'), path[2]);
  assert.deepEqual(echoPosition(path, DEFAULT_ECHO_CYCLE_LENGTH, 'cycle'), path[0]);
  assert.deepEqual(echoPosition(path, DEFAULT_ECHO_CYCLE_LENGTH + 1, 'cycle'), path[1]);

  let state = createInitialState(10);
  state = recordEcho(play(state, state.chamber.solution[0]));
  state = recordEcho(play(state, state.chamber.solution[1]));
  state = play(state, Array(state.chamber.echoCycleLength - 1).fill('wait'));
  assert.deepEqual([...getActivePlates(state)].sort(), ['a', 'b']);
  state = step(state, 'wait');
  assert.deepEqual([...getActivePlates(state)], [], 'the rewind closes both echo plates together');
});

test('inefficient recordings reduce later turns and resets remain safe', () => {
  let state = createInitialState(0);
  const optimalFirstEcho = state.chamber.solution[0];
  state = play(state, ['up', 'down', ...optimalFirstEcho]);
  state = recordEcho(state);
  assert.equal(
    turnLimit(state),
    Math.min(state.chamber.maxTurns, state.chamber.memoryBudget - optimalFirstEcho.length - 2),
  );
  const reset = resetLoop(state, true);
  assert.equal(reset.echoes.length, 1);
  assert.deepEqual(reset.player, state.chamber.start);
  assert.equal(reset.status, 'playing');
});
