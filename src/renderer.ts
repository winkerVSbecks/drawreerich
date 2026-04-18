import { Heerich } from 'heerich';
import type { Face } from 'heerich';
import { converter } from 'culori';
import { getState } from './state.ts';
import type { CameraType, Rotation } from './state.ts';

const toOklch = converter('oklch') as unknown as (
  input: string,
) => { l: number } | undefined;

function readBackground(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--bg')
      .trim() || '#1a1a2e'
  );
}

/** Pick black or white for contrast against the current background. */
function contrastingInk(bg: string): '0,0,0' | '255,255,255' {
  const parsed = toOklch(bg);
  return (parsed?.l ?? 0) > 0.5 ? '0,0,0' : '255,255,255';
}

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

/** Map a 2D grid cell to a 3D voxel position (always XZ plane). */
export function voxelPosition(
  col: number,
  row: number,
  y: number,
  depth: number,
): [number, number, number] {
  // col → X, row → Z, extrude up in -Y, depth offsets along -Y
  return [col, -y - depth, row];
}

/** Camera angle: fixed 45° base, offset by delta. */
export function cameraAngle(delta: number = 0): number {
  // Clamp result to 1–89° to prevent degenerate views (0° or 90°)
  return Math.max(1, Math.min(89, 45 + delta));
}

let scene = new Heerich({
  tile: 32,
  camera: { type: 'isometric', angle: 45 },
});

let dirty = true;
let showPlane = true;

export function setShowPlane(v: boolean): void {
  showPlane = v;
}

// Stable offset cache — recomputed only when grid/camera config changes, not when cells are drawn
let cachedOffset: { x: number; y: number } | null = null;
let cachedOffsetKey = '';

/**
 * Compute a stable canvas offset by centering the grid plane at depth 0.
 * This reference doesn't move as cells are added/removed.
 */
function computeStableOffset(
  width: number,
  height: number,
): { x: number; y: number } {
  const { grid, cameraType, cameraAngleDelta, rotation } = getState();
  const key = `${grid.cols},${grid.rows},${grid.tileSize},${rotation.x},${rotation.y},${rotation.z},${cameraType},${cameraAngleDelta},${width},${height}`;

  if (cachedOffset && cachedOffsetKey === key) return cachedOffset;

  const refScene = new Heerich({
    tile: grid.tileSize,
    camera: cameraConfig(cameraType, cameraAngleDelta),
  });

  const plane = planePosition(0, grid.cols, grid.rows);
  const rotatedPlane = rotatePlaneScale(
    plane.scale,
    plane.scaleOrigin,
    rotation,
  );
  refScene.addGeometry({
    type: 'box',
    position: plane.position,
    size: plane.size,
    scale: rotatedPlane.scale,
    scaleOrigin: rotatedPlane.scaleOrigin,
    opaque: false,
    style: {},
  } as Parameters<typeof refScene.addGeometry>[0]);

  applyRotation(refScene, rotation);

  const planeFaces = refScene.getFaces();
  if (planeFaces.length === 0) {
    cachedOffset = { x: width / 2, y: height / 2 };
  } else {
    const bounds = refScene.getBounds(0, planeFaces);
    cachedOffset = {
      x: width / 2 - (bounds.x + bounds.w / 2),
      y: height / 2 - (bounds.y + bounds.h / 2),
    };
  }

  cachedOffsetKey = key;
  return cachedOffset;
}

export function markDirty() {
  dirty = true;
}

export function cameraConfig(type: CameraType, delta: number = 0) {
  const angle = cameraAngle(delta);
  return { type, angle };
}

/** Build the plane geometry params for a given depth (always XZ plane). */
export function planePosition(
  depth: number,
  cols: number,
  rows: number,
): {
  position: [number, number, number];
  size: [number, number, number];
  scale: [number, number, number];
  scaleOrigin: [number, number, number];
} {
  // Floor plane: spans X=[0..cols), Z=[0..rows), at Y=-depth
  // scaleOrigin Y=1 anchors the thin slab to the bottom edge
  return {
    position: [0, -depth, 0],
    size: [cols, 1, rows],
    scale: [1, 0.1, 1],
    scaleOrigin: [0.5, 1, 0.5],
  };
}

/** Apply rotation turns to a heerich scene. */
function applyRotation(target: Heerich, rotation: Rotation) {
  if (rotation.x) target.rotate({ axis: 'x', turns: rotation.x });
  if (rotation.y) target.rotate({ axis: 'y', turns: rotation.y });
  if (rotation.z) target.rotate({ axis: 'z', turns: rotation.z });
}

/**
 * Rotate scale and scaleOrigin vectors to match heerich's _rot90 permutation.
 * scale components are always positive (just permute).
 * scaleOrigin components are 0-1 anchors (permute and flip on negated axes).
 */
function rotatePlaneScale(
  scale: [number, number, number],
  scaleOrigin: [number, number, number],
  rotation: Rotation,
): { scale: [number, number, number]; scaleOrigin: [number, number, number] } {
  let [sx, sy, sz] = scale;
  let [ox, oy, oz] = scaleOrigin;

  for (let i = 0; i < rotation.x; i++) {
    [sx, sy, sz] = [sx, sz, sy];
    [ox, oy, oz] = [ox, 1 - oz, oy];
  }
  for (let i = 0; i < rotation.y; i++) {
    [sx, sy, sz] = [sz, sy, sx];
    [ox, oy, oz] = [1 - oz, oy, ox];
  }
  for (let i = 0; i < rotation.z; i++) {
    [sx, sy, sz] = [sy, sx, sz];
    [ox, oy, oz] = [1 - oy, ox, oz];
  }

  return { scale: [sx, sy, sz], scaleOrigin: [ox, oy, oz] };
}

function rebuildScene() {
  if (!dirty) return;
  dirty = false;

  const {
    grid,
    paths,
    stroke,
    cameraType,
    cameraAngleDelta,
    activePlaneDepth,
    rotation,
  } = getState();

  scene = new Heerich({
    tile: grid.tileSize,
    camera: cameraConfig(cameraType, cameraAngleDelta),
  });

  const ink = contrastingInk(readBackground());
  const planeFill = `rgba(${ink},0.12)`;
  const planeFillSide = `rgba(${ink},0.08)`;
  const planeStroke = `rgba(${ink},0.1)`;
  const planeStyle = {
    top: { fill: planeFill, stroke: planeStroke, strokeWidth: 1 },
    left: { fill: planeFillSide, stroke: planeStroke, strokeWidth: 1 },
    right: { fill: planeFillSide, stroke: planeStroke, strokeWidth: 1 },
    front: { fill: planeFillSide, stroke: planeStroke, strokeWidth: 1 },
    back: { fill: planeFillSide, stroke: planeStroke, strokeWidth: 1 },
    bottom: { fill: planeFillSide, stroke: planeStroke, strokeWidth: 1 },
  };

  const strokeStyle = stroke
    ? { stroke: '#222', strokeWidth: 1 }
    : { stroke: '', strokeWidth: 0 };

  scene.batch(() => {
    // Add the semi-transparent active plane (skipped during export)
    if (showPlane) {
      const plane = planePosition(activePlaneDepth, grid.cols, grid.rows);
      const rotatedPlane = rotatePlaneScale(
        plane.scale,
        plane.scaleOrigin,
        rotation,
      );
      scene.addGeometry({
        type: 'box',
        position: plane.position,
        size: plane.size,
        scale: rotatedPlane.scale,
        scaleOrigin: rotatedPlane.scaleOrigin,
        opaque: false,
        style: planeStyle,
      } as Parameters<typeof scene.addGeometry>[0]);
    }

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
            type: 'box',
            position: voxelPosition(cell.col, cell.row, y, path.depth),
            size: 1,
            style,
          } as Parameters<typeof scene.addGeometry>[0]);
        }
      }
    }
  });

  // Apply rotation after building all geometry
  applyRotation(scene, rotation);
}

/**
 * Draw the heerich scene onto a 2D canvas context.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  rebuildScene();

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = readBackground();
  ctx.fillRect(0, 0, width, height);

  const faces = scene.getFaces();
  if (faces.length === 0) return;

  const { x: offsetX, y: offsetY } = computeStableOffset(width, height);

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
