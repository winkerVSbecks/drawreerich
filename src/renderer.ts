import { Heerich } from "heerich";
import type { Face } from "heerich";
import { getState } from "./state.ts";

/**
 * Derive three face-shade levels from a base oklch color string.
 * top = lighter, side = base, front = darker.
 */
function faceColors(base: string) {
  return {
    top: `oklch(from ${base} calc(l + 0.15) c h)`,
    side: base,
    front: `oklch(from ${base} calc(l - 0.15) c h)`,
  };
}

let scene = new Heerich({
  tile: 32,
  camera: { type: "isometric", angle: 45 },
});

let dirty = true;

export function markDirty() {
  dirty = true;
}

function rebuildScene() {
  if (!dirty) return;
  dirty = false;

  const { grid, path } = getState();

  scene = new Heerich({
    tile: grid.tileSize,
    camera: { type: "isometric", angle: 45 },
  });

  if (path.cells.length === 0) return;

  const colors = faceColors(path.color);
  const style = {
    top: { fill: colors.top, stroke: "#222", strokeWidth: 1 },
    left: { fill: colors.side, stroke: "#222", strokeWidth: 1 },
    right: { fill: colors.side, stroke: "#222", strokeWidth: 1 },
    front: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
    back: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
    bottom: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
  };

  // XZ orientation: col → X, row → Z, extrude up in Y (negative Y since Y points down)
  scene.batch(() => {
    for (const cell of path.cells) {
      for (let y = 0; y < path.height; y++) {
        scene.addGeometry({
          type: "box",
          position: [cell.col, -y, cell.row],
          size: 1,
          style,
        } as Parameters<typeof scene.addGeometry>[0]);
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
