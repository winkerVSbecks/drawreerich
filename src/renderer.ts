import { Heerich } from "heerich";
import type { Face } from "heerich";

const BASE_COLOR = "oklch(0.65 0.15 250)";

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

const colors = faceColors(BASE_COLOR);

const scene = new Heerich({
  tile: 32,
  camera: { type: "isometric", angle: 45 },
});

// Hardcoded 3×3×2 block
scene.applyGeometry({
  type: "box",
  position: [0, 0, 0],
  size: [3, 2, 3],
  style: {
    top: { fill: colors.top, stroke: "#222", strokeWidth: 1 },
    left: { fill: colors.side, stroke: "#222", strokeWidth: 1 },
    right: { fill: colors.side, stroke: "#222", strokeWidth: 1 },
    front: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
    back: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
    bottom: { fill: colors.front, stroke: "#222", strokeWidth: 1 },
  },
} as Parameters<typeof scene.applyGeometry>[0] & {
  position: number[];
  size: number[];
});

/**
 * Draw the heerich scene onto a 2D canvas context.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  const faces = scene.getFaces();
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
