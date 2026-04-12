import { Heerich } from "heerich";
import type { Face } from "heerich";
import { getState } from "./state.ts";
import type { CameraType, Orientation } from "./state.ts";

/**
 * Derive three face-shade levels from a base oklch color string.
 * top = lighter, side = base, front = darker.
 */
export function faceColors(base: string) {
  return {
    top: `oklch(from ${base} calc(l + 0.15) c h)`,
    side: base,
    front: `oklch(from ${base} calc(l - 0.15) c h)`,
  };
}

/** Map a 2D grid cell to a 3D voxel position based on orientation. */
export function voxelPosition(
  col: number,
  row: number,
  y: number,
  orientation: Orientation
): [number, number, number] {
  switch (orientation) {
    case "xz":
      // col → X, row → Z, extrude up in -Y
      return [col, -y, row];
    case "xy":
      // col → X, row → Y (row 0 = top), extrude in -Z
      return [col, -row, -y];
    case "yz":
      // col → Y (col 0 = top), row → Z, extrude in X
      return [y, -col, row];
  }
}

/** Base camera angle for each orientation. */
function baseAngle(orientation: Orientation): number {
  switch (orientation) {
    case "xz":
      return 45; // standard isometric floor view
    case "xy":
      return 30; // front-wall: rotate toward the viewer
    case "yz":
      return 60; // side-wall: rotate away from the viewer
  }
}

/** Choose a camera angle that gives a natural view of the active plane, offset by delta. */
export function cameraAngle(orientation: Orientation, delta: number = 0): number {
  const base = baseAngle(orientation);
  // Clamp result to 1–89° to prevent degenerate views (0° or 90°)
  return Math.max(1, Math.min(89, base + delta));
}

let scene = new Heerich({
  tile: 32,
  camera: { type: "isometric", angle: 45 },
});

let dirty = true;

export function markDirty() {
  dirty = true;
}

export function cameraConfig(type: CameraType, orientation: Orientation, delta: number = 0) {
  const angle = cameraAngle(orientation, delta);
  return { type, angle };
}

function rebuildScene() {
  if (!dirty) return;
  dirty = false;

  const { grid, paths, stroke, cameraType, cameraAngleDelta } = getState();

  scene = new Heerich({
    tile: grid.tileSize,
    camera: cameraConfig(cameraType, grid.orientation, cameraAngleDelta),
  });

  const hasAnyCells = paths.some((p) => p.cells.length > 0);
  if (!hasAnyCells) return;

  const strokeStyle = stroke
    ? { stroke: "#222", strokeWidth: 1 }
    : {};

  scene.batch(() => {
    for (const path of paths) {
      if (path.cells.length === 0) continue;

      const colors = faceColors(path.color);
      const style = {
        top: { fill: colors.top, ...strokeStyle },
        left: { fill: colors.side, ...strokeStyle },
        right: { fill: colors.side, ...strokeStyle },
        front: { fill: colors.front, ...strokeStyle },
        back: { fill: colors.front, ...strokeStyle },
        bottom: { fill: colors.front, ...strokeStyle },
      };

      for (const cell of path.cells) {
        for (let y = 0; y < path.height; y++) {
          scene.addGeometry({
            type: "box",
            position: voxelPosition(cell.col, cell.row, y, grid.orientation),
            size: 1,
            style,
          } as Parameters<typeof scene.addGeometry>[0]);
        }
      }
    }
  });
}

/**
 * Draw the heerich scene onto a 2D canvas context.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  rebuildScene();

  ctx.clearRect(0, 0, width, height);

  const faces = scene.getFaces();
  if (faces.length === 0) return;

  const bounds = scene.getBounds(0, faces);

  // Center the scene on the canvas
  const offsetX = width / 2 - (bounds.x + bounds.w / 2);
  const offsetY = height / 2 - (bounds.y + bounds.h / 2);

  ctx.save();
  ctx.translate(offsetX, offsetY);

  for (const face of faces) {
    drawFace(ctx, face);
  }

  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, face: Face) {
  const pts = face.points;
  if (pts.length < 3) return;

  ctx.beginPath();
  ctx.moveTo(pts.x(0), pts.y(0));
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts.x(i), pts.y(i));
  }
  ctx.closePath();

  const style = face.style;
  if (style?.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style?.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 1;
    ctx.stroke();
  }
}
