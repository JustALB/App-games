# Echo Maze: Die Archive

A mobile time-loop puzzle game where recorded versions of your past movements help solve three interconnected archive chambers.

Each chamber has one shared memory budget across every timeline. A completed route can be stored as an echo that repeats the same movements in the next loop, holds pressure plates, and unlocks the route needed to record the following echo. Longer detours consume memory and leave fewer turns for the final run. Later chambers form a strict three-echo dependency chain and combine it with collapsing floors and timed pulse fields. There are no detached quiz screens; every puzzle is expressed through movement and timing.

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
