# Plan: Drawreerich Enhancements

> Source PRD: `plans/enhancements-prd.md`

## Architectural Decisions

- **State additions**: `Path.depth: number` (default 0), `AppState.activePlaneDepth: number`, `AppState.cameraAngleDelta: number` — session-only, not persisted to localStorage or JSON export
- **`voxelPosition` signature**: changes from `(col, row, layerIndex, orientation)` to `(col, row, layerIndex, depth, orientation)` — all call sites and tests updated in Phase 4
- **Layout**: Overlay panel is universal — no breakpoint-based fixed sidebar; `#canvas-container` always fills the viewport
- **Palette model**: 10 colours generated via rampensau; index 0 = background, indices 1–9 cycle to path colours. Session-only (not persisted). Regenerating recolours all existing paths.
- **Background colour**: Applied as CSS custom property `--bg-color` on `document.documentElement`, consumed by both the app root background and the canvas clear colour
- **No manual colour overrides**: The Active Path colour picker is removed; path colours are palette-driven only

---

## Phase 1: Utility Buttons — Clear All + Image Export

**User stories**: 1, 2, 3, 4

### What to build

Add two new buttons to the File folder in the settings panel.

**Clear All**: Add a `clearAllPaths()` function to `state.ts` that resets the paths array to a single fresh empty path, sets it active, and notifies subscribers. Wire it to a button in the UI. Show a confirmation prompt before clearing.

**Export Image**: The ssam sketch function receives an `exportFrame` callback in its props. Capture it in a module-level variable inside `main.ts`. Wire an "Export Image" button to invoke it, triggering a PNG download of the 3D canvas.

### Acceptance criteria

- [ ] "Clear All" button appears in the settings panel
- [ ] Clicking Clear All (after confirming) removes all paths and leaves exactly one empty active path
- [ ] "Export Image" button appears in the settings panel
- [ ] Clicking Export Image triggers a PNG download of the 3D canvas
- [ ] `clearAllPaths()` is covered by a Vitest unit test
- [ ] A Storybook story exercises the Clear All interaction via a play function

---

## Phase 2: Fullscreen Canvas + Floating Panel

**User stories**: 5, 6, 7, 8

### What to build

Remove the `@media (min-width: 768px)` rule that pins the settings panel as a fixed sidebar and hides the hamburger menu on desktop. The overlay panel, backdrop, and hamburger button become the universal layout at all viewport sizes. `#canvas-container` occupies the full viewport at all times.

No state or renderer changes required.

### Acceptance criteria

- [ ] Canvas fills the full viewport on all screen sizes
- [ ] Hamburger menu button is always visible
- [ ] Settings panel slides in as an overlay at all screen sizes
- [ ] Clicking the backdrop dismisses the panel
- [ ] A Storybook story asserts the hamburger button is visible at a desktop-width viewport

---

## Phase 3: Interactive Camera Rotation

**User stories**: 9, 10, 11, 12

### What to build

Add `cameraAngleDelta: number` (default 0) to `AppState`. Expose `setCameraAngleDelta(delta)` and `resetCameraAngle()` from `state.ts`. Update `setOrientation()` to reset `cameraAngleDelta` to 0 when the orientation changes.

Update `cameraAngle(orientation, delta)` in `renderer.ts` to return `baseAngle(orientation) + delta`, clamped to prevent degenerate views.

In `main.ts`, attach `pointerdown` / `pointermove` / `pointerup` events to the ssam canvas element. Horizontal drag accumulates a delta, calls `setCameraAngleDelta`, and marks the renderer dirty. Add a "Reset Camera" button that calls `resetCameraAngle()`.

### Acceptance criteria

- [ ] Dragging left/right on the 3D canvas rotates the camera
- [ ] Camera rotation is clamped to prevent degenerate views
- [ ] "Reset Camera" button returns the camera to the orientation default
- [ ] Changing orientation resets the camera angle delta to 0
- [ ] `setCameraAngleDelta` and `resetCameraAngle` are covered by Vitest unit tests
- [ ] `cameraAngle` with a non-zero delta is covered by a Vitest unit test
- [ ] A Storybook story renders the scene at delta 0 and delta 20 and asserts the canvas output differs

---

## Phase 4: Drawing Depth + Plane Visualisation

**User stories**: 13–22

### What to build

This is the most structural phase — changes span state, renderer, storage, and UI.

**State**: Add `depth: number` (default 0) to the `Path` interface. Add `activePlaneDepth: number` (default 0) to `AppState`. Expose `setActivePlaneDepth(depth)` clamped to 0–20. Update `createPath()` to set `depth` from `activePlaneDepth`. Update `setOrientation()` to reset `activePlaneDepth` to 0. Update `replaceState()` to default missing `depth` fields to 0.

**Renderer**: Change `voxelPosition` to accept `depth` as a parameter and offset voxels along the perpendicular axis (XZ → Y, XY → Z, YZ → X). Update all call sites. Always add a semi-transparent plane geometry (thin box spanning the full grid) at `activePlaneDepth` to the Heerich scene.

**Storage**: Update `isValidSaveData()` so the `depth` field on each path is optional.

**UI**: Add a depth slider to Tweakpane whose label reflects the active orientation axis (Y for XZ, Z for XY, X for YZ). Update the label when orientation changes. Update `syncParamsFromState()` to refresh the slider on import/restore.

### Acceptance criteria

- [ ] Depth slider appears in the settings panel with an axis label matching the current orientation
- [ ] Moving the slider updates the semi-transparent plane position in real time
- [ ] Paths drawn at a given depth retain that depth after the slider is moved
- [ ] A new path inherits the current active plane depth
- [ ] Changing orientation resets active plane depth to 0 and updates the slider label
- [ ] A JSON file saved without `depth` on paths loads correctly with depth defaulting to 0
- [ ] `voxelPosition` with non-zero depth is covered by Vitest unit tests for all three orientations
- [ ] `isValidSaveData` accepts paths without a `depth` field (Vitest test)
- [ ] Storybook stories cover the plane at each orientation and paths rendered at multiple depths

---

## Phase 5: Rampensau Colour Palette

**User stories**:
- As a user, I want the app to generate a harmonious colour palette on load so that my drawings always have a cohesive colour scheme
- As a user, I want a "Regenerate Palette" button so that I can get a fresh palette at any time
- As a user, I want the first palette colour to set both the app and canvas background so that the visual environment matches the palette
- As a user, I want new paths to automatically receive colours from the palette so that I never need to pick colours manually
- As a user, I want regenerating the palette to recolour all existing paths so that the whole drawing stays cohesive

### What to build

Install `rampensau`. Create a `palette.ts` module that exports `generatePalette()`: calls `generateColorRamp` with `total: 10` and a random `hStart`, converts all colours to oklch strings via `colorToCSS`, and returns `{ background: string, pathColors: string[] }` (index 0 = background, indices 1–9 = path colours).

On app initialisation, call `generatePalette()`. Apply `background` as `--bg-color` on `document.documentElement`. Pass `pathColors` as the cycling source for `createPath()` — path N receives `pathColors[N % 9]`.

Remove the colour picker from the Active Path folder in Tweakpane.

Add a "Regenerate Palette" button in the File folder. Clicking it calls `generatePalette()`, updates `--bg-color`, and calls `setPathColor` on every existing path to recolour them by cycling through the new `pathColors`.

### Acceptance criteria

- [ ] `rampensau` is installed as a dependency
- [ ] App background and canvas background reflect palette colour 0 on load
- [ ] Each new path receives a colour from palette colours 1–9, cycling
- [ ] "Regenerate Palette" button appears in the settings panel
- [ ] Clicking Regenerate Palette updates the background colour and recolours all existing paths
- [ ] The Active Path colour picker is absent from the UI
- [ ] `generatePalette()` returns exactly 1 background colour and 9 path colours in oklch format (Vitest test)
- [ ] A Storybook story renders a scene with a palette applied and asserts visible coloured pixels
