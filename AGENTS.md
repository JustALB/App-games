# Mind Maze project guide

## Product

Mind Maze: Die Archive is a portrait-first mobile maze game. The player explores procedurally generated labyrinths and must solve varied reasoning gates on the route to the exit. Puzzles include arithmetic, number patterns, logic questions, memory challenges, and future spatial tasks. The experience should feel mysterious, premium, readable, and rewarding rather than like a school worksheet.

The first playable version is called "Das erste Archiv". Each run creates a new solvable maze and places three puzzle seals on the guaranteed route. Wrong answers count as mistakes; hints are optional; completing the maze shows a run summary.

## Technical direction

- Expo, React Native, and strict TypeScript.
- Android, iOS, and web should remain supported.
- Keep pure game generation and puzzle logic in `src/game.ts` so it can be tested without rendering the app.
- Keep the mobile interface in `App.tsx` until navigation or the number of screens justifies splitting it.
- Prefer deterministic seeded generation so failures can be reproduced.
- Do not add accounts, ads, analytics, payments, or backend services without an explicit product decision.

## Visual direction

Use a dark archive/temple atmosphere with deep navy surfaces, warm gold puzzle accents, cyan player highlights, geometric sigils, restrained motion, and clear touch targets. Avoid generic cartoon styling and avoid visual clutter. German is the current interface language.

## Development workflow

Use the existing checkout; do not create a Git worktree unless the user explicitly requests one. Preserve unrelated user changes. After gameplay changes, run the complete check loop and fix failures before stopping:

```sh
npm run typecheck
npm test
npm run export:web
```

For interface changes, also start the web version and verify that the page and JavaScript bundle load:

```sh
npm run web -- --port 8081
```

When changing maze generation, test many seeds and ensure the exit and all puzzle gates remain reachable. When changing puzzle generation, ensure every puzzle has exactly one correct answer and unique choices.
