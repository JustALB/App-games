# Echo Maze: Die Archive

A mobile time-loop puzzle game where recorded versions of your past movements help solve three interconnected archive chambers.

Each chamber gives the player a limited number of turns. A completed route can be stored as an echo that repeats the same movements in the next loop, holds pressure plates, and synchronizes gates while the current player takes a different route. Later chambers combine multiple echoes with collapsing floors and timed pulse fields.

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
