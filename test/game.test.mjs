import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAMBERS,
  createInitialState,
  createSealPuzzle,
  getActivePlates,
  isPulseActive,
  recordEcho,
  resetLoop,
  step,
} from '../src/game.ts';

const play = (state, actions) => actions.reduce((current, action) => step(current, action), state);

test('chamber 1 requires an echo and can be solved', () => {
  let state = createInitialState(0);
  state = play(state, ['up', 'up', 'right', 'right']);
  state = recordEcho(state);
  assert.equal(state.echoes.length, 1);
  state = play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'up', 'up', 'right', 'right', 'right']);
  assert.equal(state.status, 'complete');
});

test('chamber 2 requires two simultaneous echoes', () => {
  let state = createInitialState(1);
  state = recordEcho(play(state, ['up', 'up']));
  state = recordEcho(play(state, ['right', 'right', 'right', 'right', 'up', 'up']));
  state = play(state, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'right', 'right', 'up', 'right', 'up']);
  assert.deepEqual([...getActivePlates(state)], ['a', 'b']);
  assert.equal(state.status, 'complete');
});

test('chamber 3 combines two echoes, fragile floor, and pulse timing', () => {
  let state = createInitialState(2);
  state = recordEcho(play(state, ['up', 'up']));
  state = recordEcho(play(state, ['right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'up', 'up']));
  state = play(state, ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'up', 'right', 'right', 'right', 'right']);
  assert.equal(state.status, 'complete');
  assert.equal(state.collapsed.size, 3);
});

test('closed gates, pulse fields, resets, and seal answers are consistent', () => {
  const blocked = play(createInitialState(0), ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'up']);
  assert.equal(blocked.player.row, 4);
  assert.equal(blocked.player.col, 5);

  assert.equal(isPulseActive(7), true);
  assert.equal(isPulseActive(8), false);

  const pulseFailure = play(createInitialState(2), ['right', 'right', 'right', 'right', 'up', 'up', 'up', 'wait', 'up']);
  assert.equal(pulseFailure.status, 'fallen');
  assert.match(pulseFailure.failureReason, /Zeitimpuls/);

  const floorFailure = play(createInitialState(2), ['right', 'right', 'right', 'right', 'up', 'up', 'down']);
  assert.equal(floorFailure.status, 'fallen');
  assert.match(floorFailure.failureReason, /Boden/);

  const reset = resetLoop({ ...blocked, status: 'fallen' });
  assert.equal(reset.status, 'playing');
  assert.deepEqual(reset.player, CHAMBERS[0].start);

  for (const chamber of CHAMBERS) {
    for (let variant = 0; variant < 10; variant += 1) {
      const puzzle = createSealPuzzle(chamber.id, variant);
      assert.equal(puzzle.options.length, 4);
      assert.equal(new Set(puzzle.options).size, 4);
      assert.equal(puzzle.options.filter((option) => option === puzzle.answer).length, 1);
    }
  }
});
