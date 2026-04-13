export interface Cell {
  col: number;
  row: number;
}

export interface Path {
  id: string;
  cells: Cell[];
  color: string;
  height: number;
  depth: number;
}

export type Orientation = "xz" | "xy" | "yz";

export interface GridConfig {
  cols: number;
  rows: number;
  tileSize: number;
  orientation: Orientation;
}

export type CameraType = "isometric" | "oblique" | "orthographic";

export interface AppState {
  grid: GridConfig;
  paths: Path[];
  activePathId: string;
  stroke: boolean;
  cameraType: CameraType;
  cameraAngleDelta: number;
  activePlaneDepth: number;
}

type Listener = () => void;

const listeners: Listener[] = [];

let nextPathNum = 1;

/** Palette-driven path color source. When set, createPath() cycles through these. */
let pathColorSource: string[] = [];

/**
 * Set the palette colour source used by createPath().
 * @param colors Array of 9 path colours (indices 1–9 of the palette).
 */
export function setPathColorSource(colors: string[]) {
  pathColorSource = colors;
}

/** Get the palette colour for path N (0-indexed), cycling through 9 colours. */
function paletteColor(): string {
  if (pathColorSource.length === 0) return "#4477bb";
  // Use total path count to determine which palette colour to assign
  const idx = state.paths.length % pathColorSource.length;
  return pathColorSource[idx];
}

function makePathId(): string {
  return `path-${nextPathNum++}`;
}

const initialPath: Path = {
  id: makePathId(),
  cells: [],
  color: "#4477bb",
  height: 2,
  depth: 0,
};

const state: AppState = {
  grid: {
    cols: 16,
    rows: 16,
    tileSize: 32,
    orientation: "xz",
  },
  paths: [initialPath],
  activePathId: initialPath.id,
  stroke: true,
  cameraType: "isometric",
  cameraAngleDelta: 0,
  activePlaneDepth: 0,
};

function notify() {
  for (const fn of listeners) fn();
}

export function getState(): AppState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function getActivePath(): Path | undefined {
  return state.paths.find((p) => p.id === state.activePathId);
}

export function setActivePath(id: string) {
  if (state.paths.some((p) => p.id === id)) {
    state.activePathId = id;
    notify();
  }
}

export function createPath(): Path {
  const path: Path = {
    id: makePathId(),
    cells: [],
    color: paletteColor(),
    height: 2,
    depth: state.activePlaneDepth,
  };
  state.paths.push(path);
  state.activePathId = path.id;
  notify();
  return path;
}

/** Find which path owns a given cell, if any. */
export function getPathAtCell(col: number, row: number): Path | undefined {
  return state.paths.find((p) =>
    p.cells.some((c) => c.col === col && c.row === row)
  );
}

export function setTileSize(size: number) {
  state.grid.tileSize = size;
  notify();
}

export function setGridCols(cols: number) {
  const newCols = Math.max(4, Math.min(32, cols));
  state.grid.cols = newCols;
  for (const path of state.paths) {
    path.cells = path.cells.filter((c) => c.col < newCols);
  }
  notify();
}

export function setGridRows(rows: number) {
  const newRows = Math.max(4, Math.min(32, rows));
  state.grid.rows = newRows;
  for (const path of state.paths) {
    path.cells = path.cells.filter((c) => c.row < newRows);
  }
  notify();
}

export function setOrientation(orientation: Orientation) {
  if (state.grid.orientation === orientation) return;
  state.grid.orientation = orientation;
  state.cameraAngleDelta = 0;
  state.activePlaneDepth = 0;
  notify();
}

export function addCell(col: number, row: number) {
  // If any path already owns this cell, do nothing
  if (getPathAtCell(col, row)) return;
  const path = getActivePath();
  if (!path) return;
  path.cells.push({ col, row });
  notify();
}

export function removeCell(col: number, row: number) {
  const path = getActivePath();
  if (!path) return;
  const idx = path.cells.findIndex((c) => c.col === col && c.row === row);
  if (idx >= 0) {
    path.cells.splice(idx, 1);
    // Auto-remove empty paths (but keep at least the active one if it's the only path)
    if (path.cells.length === 0) {
      removePath(path.id);
    }
    notify();
  }
}

function removePath(id: string) {
  const idx = state.paths.findIndex((p) => p.id === id);
  if (idx < 0) return;
  state.paths.splice(idx, 1);
  // If we removed the active path, switch to another or create a new one
  if (state.activePathId === id) {
    if (state.paths.length > 0) {
      state.activePathId = state.paths[0].id;
    } else {
      const newPath: Path = {
        id: makePathId(),
        cells: [],
        color: paletteColor(),
        height: 2,
        depth: state.activePlaneDepth,
      };
      state.paths.push(newPath);
      state.activePathId = newPath.id;
    }
  }
}

export function setPathHeight(id: string, height: number) {
  const path = state.paths.find((p) => p.id === id);
  if (path) {
    path.height = height;
    notify();
  }
}

export function setPathColor(id: string, color: string) {
  const path = state.paths.find((p) => p.id === id);
  if (path) {
    path.color = color;
    notify();
  }
}

export function setStroke(enabled: boolean) {
  state.stroke = enabled;
  notify();
}

export function setCameraType(type: CameraType) {
  state.cameraType = type;
  notify();
}

export function setCameraAngleDelta(delta: number) {
  // Clamp to ±60° to prevent degenerate views
  state.cameraAngleDelta = Math.max(-60, Math.min(60, delta));
  notify();
}

export function resetCameraAngle() {
  state.cameraAngleDelta = 0;
  notify();
}

export function setActivePlaneDepth(depth: number) {
  state.activePlaneDepth = Math.max(0, Math.min(20, depth));
  notify();
}

export function hasCell(col: number, row: number): boolean {
  return state.paths.some((p) =>
    p.cells.some((c) => c.col === col && c.row === row)
  );
}

/**
 * Clear all paths, resetting to a single fresh empty path.
 */
export function clearAllPaths() {
  state.paths.length = 0;
  const newPath: Path = {
    id: makePathId(),
    cells: [],
    color: paletteColor(),
    height: 2,
    depth: state.activePlaneDepth,
  };
  state.paths.push(newPath);
  state.activePathId = newPath.id;
  notify();
}

/**
 * Replace the entire app state with the given grid config and paths.
 * Used by storage restore and JSON import.
 */
export function replaceState(grid: GridConfig, paths: Path[]) {
  state.grid.cols = grid.cols;
  state.grid.rows = grid.rows;
  state.grid.tileSize = grid.tileSize;
  state.grid.orientation = grid.orientation;

  state.paths.length = 0;
  for (const p of paths) {
    state.paths.push({ ...p, depth: p.depth ?? 0 });
  }

  // Ensure at least one path exists
  if (state.paths.length === 0) {
    const newPath: Path = {
      id: makePathId(),
      cells: [],
      color: "#4477bb",
      height: 2,
      depth: 0,
    };
    state.paths.push(newPath);
  }

  state.activePathId = state.paths[0].id;
  state.cameraAngleDelta = 0;
  state.activePlaneDepth = 0;

  // Advance nextPathNum past any existing path IDs to avoid collisions
  let maxNum = 0;
  for (const p of state.paths) {
    const match = p.id.match(/^path-(\d+)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  nextPathNum = maxNum + 1;

  notify();
}
