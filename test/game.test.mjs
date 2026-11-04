import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAMBERS,
  createInitialState,
  getActivePlates,
  isPulseActive,
  memoryUsed,
  recordEcho,
  resetLoop,
  step,
  turnLimit,
} from '../src/game.ts';

const play = (state, actions) => actions.reduce((current, action) => step(current, action), state);

test('chamber 1 teaches one persistent echo', () => {
  let state = createInitialState(0);
  state = recordEcho(play(state, ['up', 'up', 'right', 'right']));
  state = play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'up', 'up', 'right', 'right', 'right']);
  assert.equal(state.status, 'complete');
  assert.equal(memoryUsed(state), 18);
});

test('chamber 2 forces echo 1 to unlock the route for echo 2', () => {
  const attemptWithoutFirstEcho = play(createInitialState(1), [
    'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'right', 'right',
  ]);
  assert.deepEqual(attemptWithoutFirstEcho.player, { row: 4, col: 5 });

  let state = createInitialState(1);
  state = recordEcho(play(state, ['up', 'up']));
  const bypassAttempt = play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'right', 'right', 'right', 'up']);
  assert.deepEqual(bypassAttempt.player, { row: 3, col: 9 });
  assert.equal(bypassAttempt.status, 'playing');

  state = recordEcho(play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'right', 'right']));
  state = play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'wait', 'wait', 'up', 'right', 'right', 'right', 'right']);
  assert.deepEqual([...getActivePlates(state)], ['a', 'b']);
  assert.equal(state.status, 'complete');
  assert.equal(memoryUsed(state), 29);
});

test('chamber 3 builds a three-echo dependency chain within one memory budget', () => {
  let state = createInitialState(2);
  state = recordEcho(play(state, ['up', 'up']));
  state = recordEcho(play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'right', 'right']));

  const blockedAtDoubleGate = play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'up']);
  assert.deepEqual(blockedAtDoubleGate.player, { row: 4, col: 6 });

  state = recordEcho(play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'wait', 'up', 'right', 'right', 'right', 'right']));
  const thirdGateBypass = play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'wait', 'up', 'right', 'right', 'right', 'right', 'right', 'up']);
  assert.deepEqual(thirdGateBypass.player, { row: 3, col: 11 });
  assert.equal(thirdGateBypass.status, 'playing');

  state = play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'wait', 'up', 'up', 'wait', 'wait', 'up', 'right', 'right', 'right', 'right', 'right']);
  assert.deepEqual([...getActivePlates(state)], ['a', 'b', 'c']);
  assert.equal(state.status, 'complete');
  assert.equal(memoryUsed(state), 51);
  assert.equal(state.collapsed.size, 2);
});

test('inefficient echoes reduce the remaining final timeline', () => {
  let state = createInitialState(0);
  state = recordEcho(play(state, ['right', 'left', 'up', 'up', 'right', 'right']));
  assert.equal(memoryUsed(state), 6);
  assert.equal(turnLimit(state), 15);
  state = play(state, Array(15).fill('wait'));
  assert.equal(step(state, 'wait'), state);
});

test('pulse, fragile floor, gate, and reset rules stay consistent', () => {
  assert.equal(isPulseActive(7), true);
  assert.equal(isPulseActive(8), false);

  const pulseFailure = play(createInitialState(2), ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'wait', 'up']);
  assert.equal(pulseFailure.status, 'fallen');
  assert.match(pulseFailure.failureReason, /Zeitimpuls/);

  const floorFailure = play(createInitialState(2), ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'down', 'up']);
  assert.equal(floorFailure.status, 'fallen');
  assert.match(floorFailure.failureReason, /Boden/);

  const reset = resetLoop({ ...floorFailure, echoes: [[CHAMBERS[2].start]] }, true);
  assert.equal(reset.status, 'playing');
  assert.equal(reset.echoes.length, 1);
  assert.deepEqual(reset.player, CHAMBERS[2].start);
});
