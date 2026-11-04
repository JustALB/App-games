# Echo Maze: Die Archive

A mobile time-loop puzzle game where recorded versions of your past movements help solve a 30-level archive campaign.

Each chamber has one shared memory budget across every timeline. A completed route can be stored as an echo that repeats the same movements in the next loop, holds pressure plates, and unlocks the route needed to record the following echo. Longer detours consume memory and leave fewer turns for the final run.

The campaign contains six one-echo chambers, twelve two-echo chambers, and twelve three-echo chambers. Their routes vary in direction, distance, decoys, collapsing floors, pulse fields, and phase gates. Every map is generated deterministically, solved against the real game rules, and structurally checked so that no required gate can be bypassed. There are no detached quiz screens; every puzzle is expressed through movement, planning, and timing.

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
