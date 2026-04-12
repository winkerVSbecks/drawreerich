import { describe, it, expect, beforeEach } from "vitest";
import {
  getState,
  replaceState,
  addCell,
  getActivePath,
  setStroke,
  setCameraType,
} from "../state.ts";
import type { GridConfig, Path } from "../state.ts";
import { tryRestore, startAutoSave, isValidSaveData } from "../storage.ts";

const STORAGE_KEY = "drawreerich-state";

function resetState() {
  const grid: GridConfig = {
    cols: 16,
    rows: 16,
    tileSize: 32,
    orientation: "xz",
  };
  const paths: Path[] = [
    { id: "path-100", cells: [], color: "#4477bb", height: 2 },
  ];
  replaceState(grid, paths);
  setStroke(true);
  setCameraType("isometric");
}

beforeEach(() => {
  localStorage.clear();
  resetState();
});

// ─── tryRestore ──────────────────────────────────────────────────────────────

describe("tryRestore", () => {
  it("restores valid state from localStorage", () => {
    const saved = {
      version: 1,
      grid: { cols: 8, rows: 10, tileSize: 24, orientation: "xy" },
      paths: [
        { id: "path-42", cells: [{ col: 1, row: 2 }], color: "#ff0000", height: 3 },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const result = tryRestore();
    expect(result).toBe(true);

    const s = getState();
    expect(s.grid.cols).toBe(8);
    expect(s.grid.rows).toBe(10);
    expect(s.grid.tileSize).toBe(24);
    expect(s.grid.orientation).toBe("xy");
    expect(s.paths).toHaveLength(1);
    expect(s.paths[0].id).toBe("path-42");
    expect(s.paths[0].cells).toEqual([{ col: 1, row: 2 }]);
  });

  it("returns false when localStorage is empty", () => {
    expect(tryRestore()).toBe(false);
  });

  it("returns false for invalid JSON in localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{{");
    expect(tryRestore()).toBe(false);
  });

  it("returns false for valid JSON but invalid save data", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    expect(tryRestore()).toBe(false);
  });

  it("does not modify state on failure", () => {
    localStorage.setItem(STORAGE_KEY, "bad data");
    const beforeCols = getState().grid.cols;
    tryRestore();
    expect(getState().grid.cols).toBe(beforeCols);
  });
});

// ─── startAutoSave ───────────────────────────────────────────────────────────

describe("startAutoSave", () => {
  it("saves state to localStorage on state change", () => {
    startAutoSave();

    addCell(2, 3);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(isValidSaveData(parsed)).toBe(true);
    expect(parsed.paths[0].cells).toContainEqual({ col: 2, row: 3 });
  });

  it("updates localStorage when grid config changes", () => {
    startAutoSave();

    const { grid } = getState();
    replaceState(
      { ...grid, cols: 12, rows: 12, tileSize: 48, orientation: "yz" },
      getState().paths
    );

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.grid.cols).toBe(12);
    expect(parsed.grid.orientation).toBe("yz");
  });
});
