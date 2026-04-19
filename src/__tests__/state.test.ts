import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getState,
  getActivePath,
  getPathAtCell,
  hasCell,
  subscribe,
  setActivePath,
  createPath,
  addCell,
  removeCell,
  setGridCols,
  setGridRows,
  setTileSize,
  setRotation,
  setPathHeight,
  setPathColor,
  setStroke,
  setCameraType,
  setCameraAngleDelta,
  resetCameraAngle,
  setActivePlaneDepth,
  setPathColorSource,
  replaceState,
  clearAllPaths,
} from '../state.ts';
import type { GridConfig, Path } from '../state.ts';

/**
 * Reset state to a known baseline before each test.
 * We use replaceState which is the public API for full state replacement.
 */
function resetState() {
  const grid: GridConfig = {
    cols: 16,
    rows: 16,
    tileSize: 32,
  };
  const paths: Path[] = [
    { id: 'path-100', cells: [], color: '#4477bb', height: 2, depth: 0 },
  ];
  replaceState(grid, paths);
  // Also reset stroke and camera which replaceState doesn't cover
  setStroke(true);
  setCameraType('isometric');
}

// ─── getState ────────────────────────────────────────────────────────────────

describe('getState', () => {
  beforeEach(resetState);

  it('returns state object with expected shape', () => {
    const s = getState();
    expect(s).toHaveProperty('grid');
    expect(s).toHaveProperty('paths');
    expect(s).toHaveProperty('activePathId');
    expect(s).toHaveProperty('stroke');
    expect(s).toHaveProperty('cameraType');
    expect(s).toHaveProperty('rotation');
  });

  it('reflects resetState values', () => {
    const s = getState();
    expect(s.grid.cols).toBe(16);
    expect(s.grid.rows).toBe(16);
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].id).toBe('path-100');
  });
});

// ─── getActivePath ───────────────────────────────────────────────────────────

describe('getActivePath', () => {
  beforeEach(resetState);

  it('returns the active path', () => {
    const ap = getActivePath();
    expect(ap).toBeDefined();
    expect(ap!.id).toBe('path-100');
  });
});

// ─── subscribe ───────────────────────────────────────────────────────────────

describe('subscribe', () => {
  beforeEach(resetState);

  it('calls listener on state changes', () => {
    const listener = vi.fn();
    subscribe(listener);
    // replaceState in resetState already called listeners, so reset the mock
    listener.mockClear();

    setStroke(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    listener.mockClear();

    unsub();
    setStroke(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── setActivePath ───────────────────────────────────────────────────────────

describe('setActivePath', () => {
  beforeEach(resetState);

  it('switches active path to a valid id', () => {
    const newPath = createPath();
    setActivePath('path-100');
    expect(getState().activePathId).toBe('path-100');
    setActivePath(newPath.id);
    expect(getState().activePathId).toBe(newPath.id);
  });

  it('no-ops for an invalid id', () => {
    const before = getState().activePathId;
    setActivePath('nonexistent');
    expect(getState().activePathId).toBe(before);
  });

  it('syncs activePlaneDepth to the selected path depth', () => {
    // Create a path at depth 3
    setActivePlaneDepth(3);
    const elevated = createPath();
    // Switch back to the default path (depth 0)
    setActivePath('path-100');
    expect(getState().activePlaneDepth).toBe(0);
    // Switch to elevated path — depth should follow
    setActivePath(elevated.id);
    expect(getState().activePlaneDepth).toBe(3);
  });
});

// ─── createPath ──────────────────────────────────────────────────────────────

describe('createPath', () => {
  beforeEach(resetState);

  it('adds a new path and sets it active', () => {
    const before = getState().paths.length;
    const newPath = createPath();
    expect(getState().paths.length).toBe(before + 1);
    expect(getState().activePathId).toBe(newPath.id);
  });

  it('new path has empty cells and a color', () => {
    const newPath = createPath();
    expect(newPath.cells).toEqual([]);
    expect(typeof newPath.color).toBe('string');
    expect(newPath.color.length).toBeGreaterThan(0);
    expect(newPath.height).toBe(2);
  });

  it('uses palette colors when pathColorSource is set', () => {
    setPathColorSource(['oklch(0.5 0.1 120)', 'oklch(0.6 0.2 240)']);
    const p = createPath();
    expect(p.color).toMatch(/^oklch\(/);
    // Reset to avoid affecting other tests
    setPathColorSource([]);
  });
});

// ─── addCell / getPathAtCell / hasCell ────────────────────────────────────────

describe('addCell', () => {
  beforeEach(resetState);

  it('adds a cell to the active path', () => {
    addCell(3, 5);
    const ap = getActivePath()!;
    expect(ap.cells).toContainEqual({ col: 3, row: 5 });
  });

  it('hasCell returns true after adding', () => {
    addCell(3, 5);
    expect(hasCell(3, 5)).toBe(true);
  });

  it('hasCell returns false for unoccupied cell', () => {
    expect(hasCell(99, 99)).toBe(false);
  });

  it('getPathAtCell returns the owning path', () => {
    addCell(3, 5);
    const owner = getPathAtCell(3, 5);
    expect(owner).toBeDefined();
    expect(owner!.id).toBe(getState().activePathId);
  });

  it('getPathAtCell returns undefined for empty cell', () => {
    expect(getPathAtCell(99, 99)).toBeUndefined();
  });

  it('does not add if cell is already owned by another path', () => {
    addCell(3, 5);
    const firstPathId = getState().activePathId;

    createPath(); // new active path (same depth=0, height=2 → overlaps in Y)
    addCell(3, 5); // should be ignored

    const owner = getPathAtCell(3, 5);
    expect(owner!.id).toBe(firstPathId);
  });

  it('allows adding the same (col, row) cell to a second path when Y ranges do not overlap', () => {
    // First path: depth=0, height=2 → occupies Y 0–1
    addCell(3, 5);
    const firstPathId = getState().activePathId;

    // Second path: depth=2, height=2 → occupies Y 2–3 (no overlap)
    setActivePlaneDepth(2);
    const secondPath = createPath();
    setPathHeight(secondPath.id, 2);
    addCell(3, 5); // should succeed

    expect(secondPath.cells).toContainEqual({ col: 3, row: 5 });
    expect(getPathAtCell(3, 5)?.id).toBe(firstPathId); // 2D lookup returns first owner
  });

  it('blocks adding the same (col, row) when Y ranges partially overlap', () => {
    // First path: depth=1, height=3 → occupies Y 1–3
    setActivePlaneDepth(1);
    const firstPath = createPath();
    setPathHeight(firstPath.id, 3);
    addCell(4, 4);
    const firstPathId = firstPath.id;

    // Second path: depth=3, height=2 → occupies Y 3–4 (overlaps at Y=3)
    setActivePlaneDepth(3);
    const secondPath = createPath();
    setPathHeight(secondPath.id, 2);
    addCell(4, 4); // should be blocked

    expect(secondPath.cells).not.toContainEqual({ col: 4, row: 4 });
    expect(getPathAtCell(4, 4)?.id).toBe(firstPathId);
  });

  it('getPathAtCell with relativeTo returns undefined when paths do not overlap in Y', () => {
    // Path A: depth=0, height=2
    addCell(1, 1);
    const pathA = getActivePath()!;

    // Path B: depth=2, height=2 (no Y overlap with A)
    setActivePlaneDepth(2);
    const pathB = createPath();
    setPathHeight(pathB.id, 2);
    addCell(1, 1);

    expect(getPathAtCell(1, 1, pathA)).toBeUndefined();
    expect(getPathAtCell(1, 1, pathB)).toBeUndefined();
  });

  it('getPathAtCell with relativeTo returns conflicting path when Y ranges overlap', () => {
    // Path A: depth=0, height=4
    setActivePlaneDepth(0);
    const pathA = createPath();
    setPathHeight(pathA.id, 4);
    addCell(2, 2);

    // Path B: depth=3, height=2 → overlaps with A at Y 3
    setActivePlaneDepth(3);
    const pathB = createPath();
    setPathHeight(pathB.id, 2);

    expect(getPathAtCell(2, 2, pathB)?.id).toBe(pathA.id);
  });

  it('does not duplicate a cell already in the active path', () => {
    addCell(0, 0);
    addCell(0, 0); // second call should be a no-op
    expect(
      getActivePath()!.cells.filter((c) => c.col === 0 && c.row === 0),
    ).toHaveLength(1);
  });
});

// ─── removeCell ──────────────────────────────────────────────────────────────

describe('removeCell', () => {
  beforeEach(resetState);

  it('removes a cell from the active path', () => {
    addCell(2, 3);
    expect(hasCell(2, 3)).toBe(true);
    removeCell(2, 3);
    expect(hasCell(2, 3)).toBe(false);
  });

  it('no-ops if cell is not in active path', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    removeCell(99, 99);
    expect(listener).not.toHaveBeenCalled();
  });

  it('auto-removes empty path and creates a fallback', () => {
    addCell(1, 1);
    removeCell(1, 1);
    // The path was auto-removed but a fallback is created if it was the only path
    expect(getState().paths.length).toBeGreaterThanOrEqual(1);
    expect(getState().activePathId).toBeDefined();
  });
});

// ─── setGridCols / setGridRows ───────────────────────────────────────────────

describe('setGridCols', () => {
  beforeEach(resetState);

  it('updates grid cols', () => {
    setGridCols(8);
    expect(getState().grid.cols).toBe(8);
  });

  it('clamps to minimum 4', () => {
    setGridCols(1);
    expect(getState().grid.cols).toBe(4);
  });

  it('clamps to maximum 32', () => {
    setGridCols(100);
    expect(getState().grid.cols).toBe(32);
  });

  it('prunes cells outside new bounds', () => {
    addCell(15, 0);
    setGridCols(10);
    expect(hasCell(15, 0)).toBe(false);
  });
});

describe('setGridRows', () => {
  beforeEach(resetState);

  it('updates grid rows', () => {
    setGridRows(8);
    expect(getState().grid.rows).toBe(8);
  });

  it('clamps to minimum 4', () => {
    setGridRows(2);
    expect(getState().grid.rows).toBe(4);
  });

  it('clamps to maximum 32', () => {
    setGridRows(50);
    expect(getState().grid.rows).toBe(32);
  });

  it('prunes cells outside new bounds', () => {
    addCell(0, 15);
    setGridRows(10);
    expect(hasCell(0, 15)).toBe(false);
  });
});

// ─── setTileSize ─────────────────────────────────────────────────────────────

describe('setTileSize', () => {
  beforeEach(resetState);

  it('updates tile size', () => {
    setTileSize(64);
    expect(getState().grid.tileSize).toBe(64);
  });
});

// ─── setRotation ─────────────────────────────────────────────────────────────

describe('setRotation', () => {
  beforeEach(resetState);

  it('changes rotation', () => {
    setRotation({ x: 1, y: 2, z: 3 });
    expect(getState().rotation).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('normalizes values to 0-3', () => {
    setRotation({ x: 4, y: 5, z: -1 });
    expect(getState().rotation).toEqual({ x: 0, y: 1, z: 3 });
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setRotation({ x: 1, y: 0, z: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── setPathHeight / setPathColor ────────────────────────────────────────────

describe('setPathHeight', () => {
  beforeEach(resetState);

  it('updates path height', () => {
    setPathHeight('path-100', 5);
    expect(getActivePath()!.height).toBe(5);
  });

  it('no-ops for invalid id', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setPathHeight('bogus', 5);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('setPathColor', () => {
  beforeEach(resetState);

  it('updates path color', () => {
    setPathColor('path-100', '#ff0000');
    expect(getActivePath()!.color).toBe('#ff0000');
  });

  it('no-ops for invalid id', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setPathColor('bogus', '#ff0000');
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── setStroke ───────────────────────────────────────────────────────────────

describe('setStroke', () => {
  beforeEach(resetState);

  it('toggles stroke', () => {
    setStroke(false);
    expect(getState().stroke).toBe(false);
    setStroke(true);
    expect(getState().stroke).toBe(true);
  });
});

// ─── setCameraType ───────────────────────────────────────────────────────────

describe('setCameraType', () => {
  beforeEach(resetState);

  it('updates camera type', () => {
    setCameraType('oblique');
    expect(getState().cameraType).toBe('oblique');
    setCameraType('orthographic');
    expect(getState().cameraType).toBe('orthographic');
  });
});

// ─── clearAllPaths ──────────────────────────────────────────────────────────

describe('clearAllPaths', () => {
  beforeEach(resetState);

  it('resets to a single empty path', () => {
    addCell(1, 1);
    createPath();
    addCell(2, 2);
    expect(getState().paths.length).toBe(2);

    clearAllPaths();

    expect(getState().paths).toHaveLength(1);
    expect(getState().paths[0].cells).toEqual([]);
  });

  it('sets the new path as active', () => {
    clearAllPaths();

    const s = getState();
    expect(s.activePathId).toBe(s.paths[0].id);
  });

  it('removes all existing cells', () => {
    addCell(0, 0);
    addCell(1, 1);
    createPath();
    addCell(3, 3);

    clearAllPaths();

    expect(hasCell(0, 0)).toBe(false);
    expect(hasCell(1, 1)).toBe(false);
    expect(hasCell(3, 3)).toBe(false);
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    clearAllPaths();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('new path has a valid id, color, and default height', () => {
    clearAllPaths();

    const path = getState().paths[0];
    expect(path.id).toMatch(/^path-\d+$/);
    expect(typeof path.color).toBe('string');
    expect(path.color.length).toBeGreaterThan(0);
    expect(path.height).toBe(2);
  });
});

// ─── setCameraAngleDelta ─────────────────────────────────────────────────────

describe('setCameraAngleDelta', () => {
  beforeEach(resetState);

  it('updates cameraAngleDelta', () => {
    setCameraAngleDelta(20);
    expect(getState().cameraAngleDelta).toBe(20);
  });

  it('accepts negative values', () => {
    setCameraAngleDelta(-30);
    expect(getState().cameraAngleDelta).toBe(-30);
  });

  it('clamps to maximum 60', () => {
    setCameraAngleDelta(100);
    expect(getState().cameraAngleDelta).toBe(60);
  });

  it('clamps to minimum -60', () => {
    setCameraAngleDelta(-100);
    expect(getState().cameraAngleDelta).toBe(-60);
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setCameraAngleDelta(10);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── resetCameraAngle ───────────────────────────────────────────────────────

describe('resetCameraAngle', () => {
  beforeEach(resetState);

  it('resets cameraAngleDelta to 0', () => {
    setCameraAngleDelta(25);
    expect(getState().cameraAngleDelta).toBe(25);

    resetCameraAngle();
    expect(getState().cameraAngleDelta).toBe(0);
  });

  it('notifies subscribers', () => {
    setCameraAngleDelta(10);
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    resetCameraAngle();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── setActivePlaneDepth ────────────────────────────────────────────────────

describe('setActivePlaneDepth', () => {
  beforeEach(resetState);

  it('updates activePlaneDepth', () => {
    setActivePlaneDepth(5);
    expect(getState().activePlaneDepth).toBe(5);
  });

  it('clamps to minimum 0', () => {
    setActivePlaneDepth(-5);
    expect(getState().activePlaneDepth).toBe(0);
  });

  it('clamps to maximum 20', () => {
    setActivePlaneDepth(25);
    expect(getState().activePlaneDepth).toBe(20);
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setActivePlaneDepth(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── createPath inherits activePlaneDepth ───────────────────────────────────

describe('createPath inherits activePlaneDepth', () => {
  beforeEach(resetState);

  it('new path inherits current activePlaneDepth', () => {
    setActivePlaneDepth(7);
    const newPath = createPath();
    expect(newPath.depth).toBe(7);
  });

  it('new path gets depth 0 when activePlaneDepth is 0', () => {
    const newPath = createPath();
    expect(newPath.depth).toBe(0);
  });
});

// ─── replaceState ────────────────────────────────────────────────────────────

describe('replaceState', () => {
  beforeEach(resetState);

  it('replaces entire state', () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    const paths: Path[] = [
      {
        id: 'path-50',
        cells: [{ col: 1, row: 2 }],
        color: '#aabb00',
        height: 3,
        depth: 5,
      },
    ];
    replaceState(grid, paths, { x: 1, y: 0, z: 0 });

    const s = getState();
    expect(s.grid.cols).toBe(8);
    expect(s.rotation).toEqual({ x: 1, y: 0, z: 0 });
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].id).toBe('path-50');
    expect(s.paths[0].depth).toBe(5);
    expect(s.activePathId).toBe('path-50');
  });

  it('defaults rotation to {0,0,0} when not provided', () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    replaceState(grid, []);

    expect(getState().rotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('defaults missing depth fields to 0', () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    // Simulate old data without depth field
    const paths = [
      { id: 'path-60', cells: [], color: '#000000', height: 1 },
    ] as Path[];
    replaceState(grid, paths);

    expect(getState().paths[0].depth).toBe(0);
  });

  it('creates a fallback path if given empty paths array', () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    replaceState(grid, []);

    const s = getState();
    expect(s.paths).toHaveLength(1);
    expect(s.activePathId).toBe(s.paths[0].id);
  });

  it('advances nextPathNum past existing ids to avoid collisions', () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    const paths: Path[] = [
      { id: 'path-500', cells: [], color: '#000000', height: 1, depth: 0 },
    ];
    replaceState(grid, paths);

    // Creating a new path should have an id > 500
    const newPath = createPath();
    const num = parseInt(newPath.id.replace('path-', ''), 10);
    expect(num).toBeGreaterThan(500);
  });

  it('notifies subscribers', () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
    };
    replaceState(grid, []);
    expect(listener).toHaveBeenCalled();
  });
});
