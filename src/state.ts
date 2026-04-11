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
  path: Path;
}

type Listener = () => void;

const listeners: Listener[] = [];

const state: AppState = {
  grid: {
    cols: 16,
    rows: 16,
    tileSize: 32,
    orientation: "xz",
  },
  path: {
    id: "path-1",
    cells: [],
    color: "oklch(0.65 0.15 250)",
    height: 2,
  },
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

export function setTileSize(size: number) {
  state.grid.tileSize = size;
  notify();
}

export function addCell(col: number, row: number) {
  if (hasCell(col, row)) return;
  state.path.cells.push({ col, row });
  notify();
}

export function removeCell(col: number, row: number) {
  const idx = state.path.cells.findIndex(
    (c) => c.col === col && c.row === row
  );
  if (idx >= 0) {
    state.path.cells.splice(idx, 1);
    notify();
  }
}

export function hasCell(col: number, row: number): boolean {
  return state.path.cells.some((c) => c.col === col && c.row === row);
}
