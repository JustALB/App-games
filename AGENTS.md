# Echo Maze project guide

## Product

Echo Maze: Die Archive is a portrait-first mobile time-loop puzzle game. The player records movement sequences as echoes, then cooperates with those past selves to hold pressure plates, unlock the route for the next echo, cross collapsing floors, and time hazardous pulse fields. All recorded and current steps consume one shared chamber memory budget, so inefficient early routes reduce the final timeline. The experience should feel mysterious, premium, readable, and rewarding rather than like a conventional maze or school worksheet.

The playable campaign contains 30 deterministic chambers: six with one echo, twelve with two echoes, and twelve with three echoes. The route geometry, branch direction, distances, decoys, fragile floors, pulse fields, and phase gates vary across the campaign. From chamber 11 onward, echoes rewind together after 10 turns in two-echo rooms and 14 turns in three-echo rooms; keep each individual timeline below 20 turns for mobile sessions. Every later plate and the exit must remain structurally behind its required gate. Keep the solver and gate-reachability tests passing whenever maps or movement rules change. Completing a room forms its seal automatically. Do not add detached quiz or multiple-choice screens to the main path; express reasoning through movement, timing, observation, and spatial rules.

The public test build is committed under `docs/` and served at <https://raw.githack.com/JustALB/App-games/main/docs/index.html>. Regenerate it with `npm run export:web`, copy the contents of `dist/` to `docs/`, and change root-relative asset paths in `docs/index.html` to `./` paths before committing.

## Technical direction

- Expo, React Native, and strict TypeScript.
- Android, iOS, and web should remain supported.
- Keep pure game generation and puzzle logic in `src/game.ts` so it can be tested without rendering the app.
- Keep the mobile interface in `App.tsx` until navigation or the number of screens justifies splitting it.
- Keep chamber layouts authored and their intended action sequences covered by tests. New procedural elements must remain deterministic so failures can be reproduced.
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

When changing chamber logic, test complete intended action sequences plus closed-gate, trap, reset, and timing failures. When changing seal questions, ensure every question has exactly one correct answer and unique choices.
