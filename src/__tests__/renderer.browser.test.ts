import { describe, it, expect, beforeEach } from "vitest";
import {
  replaceState,
  addCell,
  setStroke,
  setCameraType,
} from "../state.ts";
import type { GridConfig, Path } from "../state.ts";
import { renderScene, markDirty } from "../renderer.ts";

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
  markDirty();
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d")!;
}

/** Check if the canvas has any non-transparent pixels. */
function hasVisiblePixels(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}

beforeEach(resetState);

describe("renderScene", () => {
  it("clears the canvas when no cells exist", () => {
    const ctx = createCanvas(200, 200);
    // Draw something first to verify it gets cleared
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 200, 200);

    renderScene(ctx, 200, 200);

    // Canvas should be cleared (no visible pixels from our red rect)
    // With no cells, the scene should be empty
    const data = ctx.getImageData(0, 0, 200, 200).data;
    let hasNonClear = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0 || data[i + 3] !== 0) {
        hasNonClear = true;
        break;
      }
    }
    expect(hasNonClear).toBe(false);
  });

  it("renders visible content when cells exist", () => {
    addCell(4, 4);
    markDirty();

    const ctx = createCanvas(600, 600);
    renderScene(ctx, 600, 600);

    expect(hasVisiblePixels(ctx, 600, 600)).toBe(true);
  });

  it("does not throw with different orientations", () => {
    addCell(2, 2);

    for (const orientation of ["xz", "xy", "yz"] as const) {
      replaceState(
        { cols: 16, rows: 16, tileSize: 32, orientation },
        [{ id: "path-1", cells: [{ col: 2, row: 2 }], color: "#4477bb", height: 2 }]
      );
      markDirty();
      const ctx = createCanvas(400, 400);
      expect(() => renderScene(ctx, 400, 400)).not.toThrow();
    }
  });

  it("markDirty triggers scene rebuild on next render", () => {
    addCell(5, 5);
    markDirty();
    const ctx = createCanvas(400, 400);
    renderScene(ctx, 400, 400);

    // Render again without markDirty — should still work (uses cached scene)
    const ctx2 = createCanvas(400, 400);
    renderScene(ctx2, 400, 400);
    expect(hasVisiblePixels(ctx2, 400, 400)).toBe(true);
  });
});
