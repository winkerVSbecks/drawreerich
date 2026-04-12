import { describe, it, expect, beforeEach, vi } from "vitest";
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
  setOrientation,
  setPathHeight,
  setPathColor,
  setStroke,
  setCameraType,
  setCameraAngleDelta,
  resetCameraAngle,
  setActivePlaneDepth,
  replaceState,
  clearAllPaths,
  hslToHex,
} from "../state.ts";
import type { GridConfig, Path } from "../state.ts";

/**
 * Reset state to a known baseline before each test.
 * We use replaceState which is the public API for full state replacement.
 */
function resetState() {
  const grid: GridConfig = {
    cols: 16,
    rows: 16,
    tileSize: 32,
    orientation: "xz",
  };
  const paths: Path[] = [
    { id: "path-100", cells: [], color: "#4477bb", height: 2, depth: 0 },
  ];
  replaceState(grid, paths);
  // Also reset stroke and camera which replaceState doesn't cover
  setStroke(true);
  setCameraType("isometric");
}

// ─── hslToHex ────────────────────────────────────────────────────────────────

describe("hslToHex", () => {
  it("converts black (l=0)", () => {
    expect(hslToHex(0, 0, 0)).toBe("#000000");
  });

  it("converts white (l=1)", () => {
    expect(hslToHex(0, 0, 1)).toBe("#ffffff");
  });

  it("converts pure red (h=0, s=1, l=0.5)", () => {
    expect(hslToHex(0, 1, 0.5)).toBe("#ff0000");
  });

  it("converts 50% grey (s=0, l=0.5)", () => {
    expect(hslToHex(0, 0, 0.5)).toBe("#808080");
  });
});

// ─── getState ────────────────────────────────────────────────────────────────

describe("getState", () => {
  beforeEach(resetState);

  it("returns state object with expected shape", () => {
    const s = getState();
    expect(s).toHaveProperty("grid");
    expect(s).toHaveProperty("paths");
    expect(s).toHaveProperty("activePathId");
    expect(s).toHaveProperty("stroke");
    expect(s).toHaveProperty("cameraType");
  });

  it("reflects resetState values", () => {
    const s = getState();
    expect(s.grid.cols).toBe(16);
    expect(s.grid.rows).toBe(16);
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].id).toBe("path-100");
  });
});

// ─── getActivePath ───────────────────────────────────────────────────────────

describe("getActivePath", () => {
  beforeEach(resetState);

  it("returns the active path", () => {
    const ap = getActivePath();
    expect(ap).toBeDefined();
    expect(ap!.id).toBe("path-100");
  });
});

// ─── subscribe ───────────────────────────────────────────────────────────────

describe("subscribe", () => {
  beforeEach(resetState);

  it("calls listener on state changes", () => {
    const listener = vi.fn();
    subscribe(listener);
    // replaceState in resetState already called listeners, so reset the mock
    listener.mockClear();

    setStroke(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops notifications", () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    listener.mockClear();

    unsub();
    setStroke(false);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── setActivePath ───────────────────────────────────────────────────────────

describe("setActivePath", () => {
  beforeEach(resetState);

  it("switches active path to a valid id", () => {
    const newPath = createPath();
    setActivePath("path-100");
    expect(getState().activePathId).toBe("path-100");
    setActivePath(newPath.id);
    expect(getState().activePathId).toBe(newPath.id);
  });

  it("no-ops for an invalid id", () => {
    const before = getState().activePathId;
    setActivePath("nonexistent");
    expect(getState().activePathId).toBe(before);
  });
});

// ─── createPath ──────────────────────────────────────────────────────────────

describe("createPath", () => {
  beforeEach(resetState);

  it("adds a new path and sets it active", () => {
    const before = getState().paths.length;
    const newPath = createPath();
    expect(getState().paths.length).toBe(before + 1);
    expect(getState().activePathId).toBe(newPath.id);
  });

  it("new path has empty cells and a color", () => {
    const newPath = createPath();
    expect(newPath.cells).toEqual([]);
    expect(newPath.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(newPath.height).toBe(2);
  });
});

// ─── addCell / getPathAtCell / hasCell ────────────────────────────────────────

describe("addCell", () => {
  beforeEach(resetState);

  it("adds a cell to the active path", () => {
    addCell(3, 5);
    const ap = getActivePath()!;
    expect(ap.cells).toContainEqual({ col: 3, row: 5 });
  });

  it("hasCell returns true after adding", () => {
    addCell(3, 5);
    expect(hasCell(3, 5)).toBe(true);
  });

  it("hasCell returns false for unoccupied cell", () => {
    expect(hasCell(99, 99)).toBe(false);
  });

  it("getPathAtCell returns the owning path", () => {
    addCell(3, 5);
    const owner = getPathAtCell(3, 5);
    expect(owner).toBeDefined();
    expect(owner!.id).toBe(getState().activePathId);
  });

  it("getPathAtCell returns undefined for empty cell", () => {
    expect(getPathAtCell(99, 99)).toBeUndefined();
  });

  it("does not add if cell is already owned by another path", () => {
    addCell(3, 5);
    const firstPathId = getState().activePathId;

    createPath(); // new active path
    addCell(3, 5); // should be ignored

    const owner = getPathAtCell(3, 5);
    expect(owner!.id).toBe(firstPathId);
  });
});

// ─── removeCell ──────────────────────────────────────────────────────────────

describe("removeCell", () => {
  beforeEach(resetState);

  it("removes a cell from the active path", () => {
    addCell(2, 3);
    expect(hasCell(2, 3)).toBe(true);
    removeCell(2, 3);
    expect(hasCell(2, 3)).toBe(false);
  });

  it("no-ops if cell is not in active path", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    removeCell(99, 99);
    expect(listener).not.toHaveBeenCalled();
  });

  it("auto-removes empty path and creates a fallback", () => {
    addCell(1, 1);
    const pathCount = getState().paths.length;
    removeCell(1, 1);
    // The path was auto-removed but a fallback is created if it was the only path
    expect(getState().paths.length).toBeGreaterThanOrEqual(1);
    expect(getState().activePathId).toBeDefined();
  });
});

// ─── setGridCols / setGridRows ───────────────────────────────────────────────

describe("setGridCols", () => {
  beforeEach(resetState);

  it("updates grid cols", () => {
    setGridCols(8);
    expect(getState().grid.cols).toBe(8);
  });

  it("clamps to minimum 4", () => {
    setGridCols(1);
    expect(getState().grid.cols).toBe(4);
  });

  it("clamps to maximum 32", () => {
    setGridCols(100);
    expect(getState().grid.cols).toBe(32);
  });

  it("prunes cells outside new bounds", () => {
    addCell(15, 0);
    setGridCols(10);
    expect(hasCell(15, 0)).toBe(false);
  });
});

describe("setGridRows", () => {
  beforeEach(resetState);

  it("updates grid rows", () => {
    setGridRows(8);
    expect(getState().grid.rows).toBe(8);
  });

  it("clamps to minimum 4", () => {
    setGridRows(2);
    expect(getState().grid.rows).toBe(4);
  });

  it("clamps to maximum 32", () => {
    setGridRows(50);
    expect(getState().grid.rows).toBe(32);
  });

  it("prunes cells outside new bounds", () => {
    addCell(0, 15);
    setGridRows(10);
    expect(hasCell(0, 15)).toBe(false);
  });
});

// ─── setTileSize ─────────────────────────────────────────────────────────────

describe("setTileSize", () => {
  beforeEach(resetState);

  it("updates tile size", () => {
    setTileSize(64);
    expect(getState().grid.tileSize).toBe(64);
  });
});

// ─── setOrientation ──────────────────────────────────────────────────────────

describe("setOrientation", () => {
  beforeEach(resetState);

  it("changes orientation", () => {
    setOrientation("xy");
    expect(getState().grid.orientation).toBe("xy");
  });

  it("no-ops when orientation is the same", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setOrientation("xz"); // already xz
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── setPathHeight / setPathColor ────────────────────────────────────────────

describe("setPathHeight", () => {
  beforeEach(resetState);

  it("updates path height", () => {
    setPathHeight("path-100", 5);
    expect(getActivePath()!.height).toBe(5);
  });

  it("no-ops for invalid id", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setPathHeight("bogus", 5);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("setPathColor", () => {
  beforeEach(resetState);

  it("updates path color", () => {
    setPathColor("path-100", "#ff0000");
    expect(getActivePath()!.color).toBe("#ff0000");
  });

  it("no-ops for invalid id", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setPathColor("bogus", "#ff0000");
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── setStroke ───────────────────────────────────────────────────────────────

describe("setStroke", () => {
  beforeEach(resetState);

  it("toggles stroke", () => {
    setStroke(false);
    expect(getState().stroke).toBe(false);
    setStroke(true);
    expect(getState().stroke).toBe(true);
  });
});

// ─── setCameraType ───────────────────────────────────────────────────────────

describe("setCameraType", () => {
  beforeEach(resetState);

  it("updates camera type", () => {
    setCameraType("oblique");
    expect(getState().cameraType).toBe("oblique");
    setCameraType("orthographic");
    expect(getState().cameraType).toBe("orthographic");
  });
});

// ─── clearAllPaths ──────────────────────────────────────────────────────────

describe("clearAllPaths", () => {
  beforeEach(resetState);

  it("resets to a single empty path", () => {
    addCell(1, 1);
    createPath();
    addCell(2, 2);
    expect(getState().paths.length).toBe(2);

    clearAllPaths();

    expect(getState().paths).toHaveLength(1);
    expect(getState().paths[0].cells).toEqual([]);
  });

  it("sets the new path as active", () => {
    clearAllPaths();

    const s = getState();
    expect(s.activePathId).toBe(s.paths[0].id);
  });

  it("removes all existing cells", () => {
    addCell(0, 0);
    addCell(1, 1);
    createPath();
    addCell(3, 3);

    clearAllPaths();

    expect(hasCell(0, 0)).toBe(false);
    expect(hasCell(1, 1)).toBe(false);
    expect(hasCell(3, 3)).toBe(false);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    clearAllPaths();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("new path has a valid id, color, and default height", () => {
    clearAllPaths();

    const path = getState().paths[0];
    expect(path.id).toMatch(/^path-\d+$/);
    expect(path.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(path.height).toBe(2);
  });
});

// ─── setCameraAngleDelta ─────────────────────────────────────────────────────

describe("setCameraAngleDelta", () => {
  beforeEach(resetState);

  it("updates cameraAngleDelta", () => {
    setCameraAngleDelta(20);
    expect(getState().cameraAngleDelta).toBe(20);
  });

  it("accepts negative values", () => {
    setCameraAngleDelta(-30);
    expect(getState().cameraAngleDelta).toBe(-30);
  });

  it("clamps to maximum 60", () => {
    setCameraAngleDelta(100);
    expect(getState().cameraAngleDelta).toBe(60);
  });

  it("clamps to minimum -60", () => {
    setCameraAngleDelta(-100);
    expect(getState().cameraAngleDelta).toBe(-60);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setCameraAngleDelta(10);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── resetCameraAngle ───────────────────────────────────────────────────────

describe("resetCameraAngle", () => {
  beforeEach(resetState);

  it("resets cameraAngleDelta to 0", () => {
    setCameraAngleDelta(25);
    expect(getState().cameraAngleDelta).toBe(25);

    resetCameraAngle();
    expect(getState().cameraAngleDelta).toBe(0);
  });

  it("notifies subscribers", () => {
    setCameraAngleDelta(10);
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    resetCameraAngle();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── setOrientation resets cameraAngleDelta ─────────────────────────────────

describe("setOrientation resets cameraAngleDelta", () => {
  beforeEach(resetState);

  it("resets cameraAngleDelta to 0 when orientation changes", () => {
    setCameraAngleDelta(30);
    expect(getState().cameraAngleDelta).toBe(30);

    setOrientation("xy");
    expect(getState().cameraAngleDelta).toBe(0);
  });

  it("does not reset cameraAngleDelta when orientation is unchanged", () => {
    setCameraAngleDelta(30);
    setOrientation("xz"); // already xz, no-op
    expect(getState().cameraAngleDelta).toBe(30);
  });
});

// ─── setActivePlaneDepth ────────────────────────────────────────────────────

describe("setActivePlaneDepth", () => {
  beforeEach(resetState);

  it("updates activePlaneDepth", () => {
    setActivePlaneDepth(5);
    expect(getState().activePlaneDepth).toBe(5);
  });

  it("clamps to minimum 0", () => {
    setActivePlaneDepth(-5);
    expect(getState().activePlaneDepth).toBe(0);
  });

  it("clamps to maximum 20", () => {
    setActivePlaneDepth(25);
    expect(getState().activePlaneDepth).toBe(20);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    setActivePlaneDepth(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── createPath inherits activePlaneDepth ───────────────────────────────────

describe("createPath inherits activePlaneDepth", () => {
  beforeEach(resetState);

  it("new path inherits current activePlaneDepth", () => {
    setActivePlaneDepth(7);
    const newPath = createPath();
    expect(newPath.depth).toBe(7);
  });

  it("new path gets depth 0 when activePlaneDepth is 0", () => {
    const newPath = createPath();
    expect(newPath.depth).toBe(0);
  });
});

// ─── setOrientation resets activePlaneDepth ─────────────────────────────────

describe("setOrientation resets activePlaneDepth", () => {
  beforeEach(resetState);

  it("resets activePlaneDepth to 0 when orientation changes", () => {
    setActivePlaneDepth(10);
    expect(getState().activePlaneDepth).toBe(10);

    setOrientation("xy");
    expect(getState().activePlaneDepth).toBe(0);
  });

  it("does not reset activePlaneDepth when orientation is unchanged", () => {
    setActivePlaneDepth(10);
    setOrientation("xz"); // already xz, no-op
    expect(getState().activePlaneDepth).toBe(10);
  });
});

// ─── replaceState ────────────────────────────────────────────────────────────

describe("replaceState", () => {
  beforeEach(resetState);

  it("replaces entire state", () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
      orientation: "yz",
    };
    const paths: Path[] = [
      { id: "path-50", cells: [{ col: 1, row: 2 }], color: "#aabb00", height: 3, depth: 5 },
    ];
    replaceState(grid, paths);

    const s = getState();
    expect(s.grid.cols).toBe(8);
    expect(s.grid.orientation).toBe("yz");
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].id).toBe("path-50");
    expect(s.paths[0].depth).toBe(5);
    expect(s.activePathId).toBe("path-50");
  });

  it("defaults missing depth fields to 0", () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
      orientation: "xz",
    };
    // Simulate old data without depth field
    const paths = [
      { id: "path-60", cells: [], color: "#000000", height: 1 },
    ] as Path[];
    replaceState(grid, paths);

    expect(getState().paths[0].depth).toBe(0);
  });

  it("creates a fallback path if given empty paths array", () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
      orientation: "xz",
    };
    replaceState(grid, []);

    const s = getState();
    expect(s.paths).toHaveLength(1);
    expect(s.activePathId).toBe(s.paths[0].id);
  });

  it("advances nextPathNum past existing ids to avoid collisions", () => {
    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
      orientation: "xz",
    };
    const paths: Path[] = [
      { id: "path-500", cells: [], color: "#000000", height: 1, depth: 0 },
    ];
    replaceState(grid, paths);

    // Creating a new path should have an id > 500
    const newPath = createPath();
    const num = parseInt(newPath.id.replace("path-", ""), 10);
    expect(num).toBeGreaterThan(500);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    subscribe(listener);
    listener.mockClear();

    const grid: GridConfig = {
      cols: 8,
      rows: 8,
      tileSize: 16,
      orientation: "xz",
    };
    replaceState(grid, []);
    expect(listener).toHaveBeenCalled();
  });
});
