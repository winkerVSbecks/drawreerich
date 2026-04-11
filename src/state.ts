export interface Cell {
  col: number;
  row: number;
}

export interface Path {
  id: string;
  cells: Cell[];
  color: string;
  height: number;
}

export type Orientation = "xz" | "xy" | "yz";

export interface GridConfig {
  cols: number;
  rows: number;
  tileSize: number;
  orientation: Orientation;
}

export interface AppState {
  grid: GridConfig;
  paths: Path[];
  activePathId: string;
}

type Listener = () => void;

const listeners: Listener[] = [];

let nextPathNum = 1;

function randomOklchColor(): string {
  const l = 0.55 + Math.random() * 0.2; // 0.55–0.75
  const c = 0.1 + Math.random() * 0.12; // 0.10–0.22
  const h = Math.floor(Math.random() * 360);
  return `oklch(${l.toFixed(2)} ${c.toFixed(2)} ${h})`;
}

function makePathId(): string {
  return `path-${nextPathNum++}`;
}

const initialPath: Path = {
  id: makePathId(),
  cells: [],
  color: "oklch(0.65 0.15 250)",
  height: 2,
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
    color: randomOklchColor(),
    height: 2,
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
      const newPath = {
        id: makePathId(),
        cells: [],
        color: randomOklchColor(),
        height: 2,
      };
      state.paths.push(newPath);
      state.activePathId = newPath.id;
    }
  }
}

export function hasCell(col: number, row: number): boolean {
  return state.paths.some((p) =>
    p.cells.some((c) => c.col === col && c.row === row)
  );
}
