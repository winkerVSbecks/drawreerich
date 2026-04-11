# Plan: Voxel Path Editor

> Source PRD: drawreerich grill-me session (2026-04-11)

## Architectural decisions

- **Stack**: Plain ssam + Vite + TypeScript. No React. Remove React from package.json, add `heerich` and `tweakpane`.
- **Module structure**:
  - `src/main.ts` — entry point, layout init, wires modules together
  - `src/state.ts` — all mutable app state, single source of truth
  - `src/renderer.ts` — ssam setup, heerich voxel rendering
  - `src/grid-editor.ts` — 2D canvas grid interaction (paint, erase, select)
  - `src/storage.ts` — localStorage auto-save/restore, JSON export/import
- **Path model**: `{ id: string, cells: Array<{col: number, row: number}>, color: string, height: number }`
- **Grid config**: `{ cols: number, rows: number, tileSize: number, orientation: 'xz' | 'xy' | 'yz' }`
- **Connectivity**: 4-directional only (orthogonal). Branching (tetris-like shapes) allowed — paths are connected polyominoes, not linear sequences.
- **Camera**: isometric default. User can switch to oblique or orthographic via dropdown.
- **Face shading**: CSS relative color syntax on a per-path base color. Top face = lightest, left/right = mid, front/back = darkest.
- **Orientation semantics**: XZ = floor (voxels extrude up in Y), XY = front wall (voxels extrude in Z), YZ = side wall (voxels extrude in X). Switching orientation remaps all path cell coordinates — single active orientation at all times.
- **Save format**: `{ version: 1, grid: GridConfig, paths: Path[] }` as JSON.
- **Responsive breakpoint**: 768px — sidebar collapses to overlay menu below this width.

---

## Phase 1: Scaffolding + Static Render

**User stories**: As a developer, I need the full rendering pipeline working end-to-end so that subsequent phases can build on a proven foundation.

### What to build

Strip React from the project. Install `heerich` and `tweakpane`. Replace `index.html` / `src/main.ts` with a plain TypeScript entry point. Build the CSS layout: ssam canvas in a left container, sidebar div on the right containing a Tweakpane mount point and a grid editor mount point below it. Render a single hardcoded voxel box (e.g. a 3×3×2 block) through heerich → ssam → canvas, with isometric camera and the three face shade levels visible. Tweakpane should mount and show a placeholder binding to confirm it renders in the sidebar.

### Acceptance criteria

- [ ] React is removed from dependencies; project builds and runs with plain TypeScript
- [ ] Page shows canvas on the left and sidebar on the right
- [ ] A voxel (or small group of voxels) renders on the ssam canvas with distinct top/side/front face shading
- [ ] Tweakpane mounts in the sidebar and displays at least one control
- [ ] No console errors on load

---

## Phase 2: Single Path Drawing

**User stories**: As a user, I want to paint cells on the 2D grid editor and immediately see corresponding voxels appear on the 3D canvas.

### What to build

Implement `state.ts` with a single path (cells array, color, height) and a grid config (cols, rows, tileSize, orientation with a hardcoded default). Implement `grid-editor.ts`: render the grid as a 2D canvas below the Tweakpane area, handle mouse events so click-drag adds cells to the path and right-click-drag removes them. On every state change, `renderer.ts` redraws — it reads the path's cells, maps each `{col, row}` to a 3D voxel position based on orientation, and renders via heerich. The 3D canvas updates in real-time as the user draws.

### Acceptance criteria

- [ ] 2D grid editor renders in the sidebar below the Tweakpane area
- [ ] Click-drag on empty cells adds them to the path; voxels appear immediately on the 3D canvas
- [ ] Right-click-drag on filled cells removes them; voxels disappear immediately
- [ ] Voxels are positioned correctly for XZ orientation (floor plane, extruded up in Y)
- [ ] Path cells are stored as `{col, row}` coordinates in state

---

## Phase 3: Multi-Path Management

**User stories**: As a user, I want to create multiple paths with different colors, switch between them, and have each path rendered as a distinct color in both views.

### What to build

Extend `state.ts` to hold an array of paths and an `activePathId`. Add a "New Path" button in Tweakpane — creates a new path with a random oklch color and makes it active. Render colored swatches for all paths in the grid editor area (above or alongside the grid); clicking a swatch makes that path active. Clicking on an existing cell in the 2D grid selects the path that owns that cell. Painting always adds to the active path. When a path loses its last cell, it is removed from the array automatically. The 3D renderer draws all paths simultaneously, each with its own color. Inactive paths in the 2D grid editor are dimmed to 50% opacity; the active path's cells get a bright outline.

### Acceptance criteria

- [ ] "New Path" button creates a path with a distinct random oklch color
- [ ] Colored swatches show all current paths; clicking selects the active path
- [ ] Painting adds cells to the active path only
- [ ] Clicking an existing cell in the 2D grid switches the active path to the one that owns that cell
- [ ] All paths render simultaneously on the 3D canvas in their respective colors
- [ ] A path with zero cells is automatically removed from the list
- [ ] Inactive paths are visually dimmed in the 2D grid; active path cells have a visible outline

---

## Phase 4: Grid Configuration + Orientation

**User stories**: As a user, I want to control the grid dimensions and voxel tile size, and switch between XZ/XY/YZ orientations to place paths on different planes.

### What to build

Add Tweakpane bindings for: grid cols, grid rows, tile size (heerich tile pixels), and an orientation dropdown (XZ / XY / YZ). When cols/rows change, the 2D grid editor resizes and any out-of-bounds cells are clipped. When tile size changes, the heerich renderer uses the new tile dimensions. When orientation changes, all path cell coordinates are remapped via axis substitution (e.g. XZ → XY remaps the Z axis to Y), the voxel extrusion direction updates, and the camera adjusts to a natural viewing angle for the new plane. The 2D grid editor axis labels update to reflect the active orientation.

### Acceptance criteria

- [ ] Tweakpane has sliders/inputs for cols, rows, and tile size
- [ ] Tweakpane has a dropdown for orientation (XZ / XY / YZ)
- [ ] Changing cols/rows updates the 2D grid and clips out-of-bounds cells
- [ ] Changing tile size updates the 3D render scale
- [ ] Switching orientation remaps all path cells to the new plane's axes
- [ ] Voxels extrude in the correct direction for each orientation (Y for XZ, Z for XY, X for YZ)
- [ ] The camera angle auto-adjusts to give a natural view of the active plane
- [ ] The 2D grid editor shows axis labels matching the active orientation

---

## Phase 5: Visual Polish

**User stories**: As a user, I want to control the height of each path's voxels, see realistic face shading, and have options for stroke and camera type.

### What to build

Add a height slider to the active path section in Tweakpane (controls the extrusion depth for that path). Implement face shading using CSS relative color syntax on the path's base color: top face uses `oklch(from <base> calc(l + 0.15) c h)`, left/right faces use the base color directly, front/back faces use `oklch(from <base> calc(l - 0.15) c h)`. Add a stroke toggle to Tweakpane (on by default) that adds/removes an outline on voxel faces. Add a camera type dropdown (isometric / oblique / orthographic) to Tweakpane.

### Acceptance criteria

- [ ] Active path section in Tweakpane has a height slider; changing it updates voxel extrusion depth in real-time
- [ ] Voxel top faces are lighter than the base color, front/back faces are darker, using CSS relative color syntax
- [ ] Stroke toggle shows/hides outlines on voxel faces
- [ ] Camera type dropdown switches between isometric, oblique, and orthographic projections
- [ ] Color picker in Tweakpane changes the active path's base color; shading updates accordingly

---

## Phase 6: Persistence

**User stories**: As a user, I want my work to survive a page refresh, and be able to export and import my creations as JSON files.

### What to build

Implement `storage.ts`. On every state change, serialize the full state (`grid` config + `paths` array) to localStorage. On app load, check localStorage and restore state if present; otherwise start with defaults (16×16 grid, tileSize 32, XZ orientation, no paths). Add "Export JSON" and "Import JSON" buttons to Tweakpane: export triggers a file download of the serialized state; import opens a file picker and loads the JSON into state, replacing current state.

### Acceptance criteria

- [ ] Refreshing the page restores the previous session (grid config + all paths + colors + heights)
- [ ] "Export JSON" downloads a valid JSON file with `version`, `grid`, and `paths` fields
- [ ] "Import JSON" loads a previously exported file and renders it correctly
- [ ] A fresh load with no localStorage shows a blank 16×16 XZ grid
- [ ] Invalid or malformed JSON on import shows an error without crashing

---

## Phase 7: Responsive Layout

**User stories**: As a user on a smaller screen, I want to access controls without the sidebar consuming too much space.

### What to build

Add CSS media query at 768px. Below this breakpoint, the sidebar is hidden by default and a hamburger/menu button appears overlaid on the canvas. Tapping the button slides the sidebar in as a full-width overlay over the canvas. Tapping outside or pressing a close button dismisses it. Above 768px, the layout reverts to the standard side-by-side view. No state is lost when toggling the sidebar.

### Acceptance criteria

- [ ] At viewport width ≥ 768px, canvas and sidebar display side by side
- [ ] At viewport width < 768px, sidebar is hidden and a menu button is visible
- [ ] Tapping the menu button opens the sidebar as an overlay
- [ ] Tapping outside the sidebar or a close button dismisses it
- [ ] No state is lost when opening/closing the sidebar
- [ ] The 2D grid editor and Tweakpane controls are fully usable inside the overlay
