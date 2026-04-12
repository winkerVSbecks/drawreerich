# CLAUDE.md

## Package Manager

This project uses **pnpm** (v10.33.0, specified in `packageManager` field of `package.json`). Always use `pnpm` instead of `npm` or `yarn`.

```bash
pnpm install        # install dependencies
pnpm dev            # start vite dev server
pnpm build          # typecheck + production build (tsc -b && vite build)
pnpm test           # run vitest unit tests
pnpm test:unit      # run vitest with explicit config
pnpm lint           # run eslint
pnpm storybook      # start storybook dev server on port 6006
pnpm build-storybook # build storybook static site
```

## Project Overview

Drawreerich is a 3D grid drawing application. Users draw on a 2D grid; the app renders an isometric/oblique/orthographic 3D voxel visualization in real time.

## Architecture

- **`src/state.ts`** — Global state with pub/sub pattern. Defines `AppState`, `Path`, `GridConfig`, `Cell` types. All mutations call `notify()` to trigger subscribers.
- **`src/renderer.ts`** — 3D rendering via the `heerich` library. Builds voxel scenes from path cells. Exports `renderScene()` and `markDirty()`.
- **`src/grid-editor.ts`** — 2D canvas grid editor. Handles mouse/touch input for painting/erasing cells.
- **`src/main.ts`** — Orchestrator. Wires Tweakpane UI controls to state, initializes grid editor, sets up `ssam` sketch for 3D rendering, manages sidebar UI.
- **`src/storage.ts`** — LocalStorage persistence and JSON import/export.

## Tech Stack

- TypeScript (strict mode, ES2023 target)
- Vite for bundling
- Vitest for unit tests
- Storybook (web-components-vite) for component stories
- ESLint (flat config, v9)
- Tweakpane for UI controls
- `ssam` for sketch/canvas lifecycle
- `heerich` for 3D voxel scene building
- No UI framework — vanilla DOM

## Testing

- Unit tests: `src/__tests__/*.test.ts`
- Storybook stories: `src/__stories__/*.stories.ts` (with play functions for interaction tests)
- Vitest config excludes `*.browser.test.ts` files

## Code Style

- ESLint flat config with `typescript-eslint`
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- ES modules (`"type": "module"` in package.json)

## Layout

The app uses a fullscreen canvas with a hamburger-triggered slide-in overlay panel at all viewport sizes. The settings panel is hidden by default and slides in from the right.
