import {
  replaceState,
  setStroke,
  setCameraType,
} from "../state.ts";
import type { GridConfig, Path } from "../state.ts";

export function resetState() {
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
  setStroke(true);
  setCameraType("isometric");
}

/** Check if the canvas has any non-transparent pixels. */
export function hasVisiblePixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}
