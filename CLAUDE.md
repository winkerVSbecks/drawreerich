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

Fullscreen canvas with a full-width top bar:

- **Top bar** (`#top-bar`): spans the full viewport width. Left side has the brand wordmark and File menu. Right side (`.top-bar-right`) holds the three settings menus followed by the About info button.
- **Settings menus** are three native `<details class="settings-menu">` elements: `Artboard`, `Camera`, `Draw`. Each hosts its own Tweakpane instance mounted in `#pane-{name}`. Only one menu is open at a time (coordinated via `toggle` events); the File menu closes them and vice versa. Click-outside and `Esc` close any open menu.
  - `Artboard` — cols, rows, tileSize.
  - `Camera` — camera type, Reset Camera, Floor/Front/Side rotation presets, X/Y/Z rotation sliders (all flat, no sub-folder).
  - `Draw` — grid-editor blade (2D drawing surface + path swatches), height, color, depth, stroke, New Path.
- **Modals** use native `<dialog>`: `#about-dialog`, `#confirm-dialog`, `#alert-dialog`. `askConfirm()` and `showAlert()` in `main.ts` replace `window.confirm` / `window.alert`.
