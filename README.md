# Echo Maze: Die Archive

A mobile time-loop puzzle game where recorded versions of your past movements help solve a 30-level archive campaign.

Each chamber has one shared memory budget across every timeline. A completed route can be stored as an echo that repeats the same movements in the next loop, holds pressure plates, and unlocks the route needed to record the following echo. Longer detours consume memory and leave fewer turns for the final run.

The campaign contains six one-echo chambers, twelve two-echo chambers, and twelve three-echo chambers. Their routes vary in direction, distance, decoys, collapsing floors, pulse fields, and phase gates. Starting in chamber 11, all stored echoes rewind together after a short countdown, so an open route can close again while the current timeline is moving. Two-echo chambers use a 14-turn cycle and three-echo chambers an 18-turn cycle. Every individual loop stays at 20 turns or less for short mobile sessions.

Eleven chambers disable standing still and add synchronization niches. MAIN must move into a side route or briefly backtrack while every stored echo advances at the same time. The expanded maps also contain longer dead ends, so a wrong turn consumes real memory. The HUD highlights a nearby locked gate and explains which kind of timing move is available.

Every map is generated deterministically, solved against the real game rules, and structurally checked so that no required gate can be bypassed. There are no detached quiz screens; every puzzle is expressed through movement, planning, and timing.

The mobile presentation uses an illustrated impossible archive, continuous luminous maze routes, animated player and echo movement, and responsive feedback for blocked moves. Boards range from 13×11 to 17×17 cells and include deliberate dead ends that punish careless routing through the shared memory budget.

Play the current web test build at <https://raw.githack.com/JustALB/App-games/main/docs/index.html>.

## Development

```sh
npm ci
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` for a specific target.

## Checks

```sh
npm run typecheck
npm test
npm run export:web
```
