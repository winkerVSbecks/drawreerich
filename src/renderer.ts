import { Heerich } from 'heerich';
import type { Face } from 'heerich';
import { getState } from './state.ts';
import type { CameraType, Orientation } from './state.ts';

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

/** Map a 2D grid cell to a 3D voxel position based on orientation and depth. */
export function voxelPosition(
  col: number,
  row: number,
  y: number,
  depth: number,
  orientation: Orientation,
): [number, number, number] {
  switch (orientation) {
    case 'xz':
      // col → X, row → Z, extrude up in -Y, depth offsets along -Y
      return [col, -y - depth, row];
    case 'xy':
      // col → X, row → Y (+Y = down), extrude in -Z, depth offsets along -Z
      return [col, row, -y - depth];
    case 'yz':
      // col → Y (+Y = down), row → Z, extrude in +X, depth offsets along +X
      return [y + depth, col, row];
  }
}

/** Base camera angle for each orientation. */
function baseAngle(orientation: Orientation): number {
  switch (orientation) {
    case 'xz':
      return 45; // standard isometric floor view
    case 'xy':
      return 30; // front-wall: rotate toward the viewer
    case 'yz':
      return 60; // side-wall: rotate away from the viewer
  }
}

/** Choose a camera angle that gives a natural view of the active plane, offset by delta. */
export function cameraAngle(
  orientation: Orientation,
  delta: number = 0,
): number {
  const base = baseAngle(orientation);
  // Clamp result to 1–89° to prevent degenerate views (0° or 90°)
  return Math.max(1, Math.min(89, base + delta));
}

let scene = new Heerich({
  tile: 32,
  camera: { type: 'isometric', angle: 45 },
});

let dirty = true;

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
  const { grid, cameraType, cameraAngleDelta } = getState();
  const key = `${grid.cols},${grid.rows},${grid.tileSize},${grid.orientation},${cameraType},${cameraAngleDelta},${width},${height}`;

  if (cachedOffset && cachedOffsetKey === key) return cachedOffset;

  const refScene = new Heerich({
    tile: grid.tileSize,
    camera: cameraConfig(cameraType, grid.orientation, cameraAngleDelta),
  });

  const plane = planePosition(0, grid.cols, grid.rows, grid.orientation);
  refScene.addGeometry({
    type: 'box',
    position: plane.position,
    size: plane.size,
    scale: plane.scale,
    scaleOrigin: plane.scaleOrigin,
    opaque: false,
    style: {},
  } as Parameters<typeof refScene.addGeometry>[0]);

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

export function cameraConfig(
  type: CameraType,
  orientation: Orientation,
  delta: number = 0,
) {
  const angle = cameraAngle(orientation, delta);
  return { type, angle };
}

/** Build the plane geometry params for a given depth and orientation. */
export function planePosition(
  depth: number,
  cols: number,
  rows: number,
  orientation: Orientation,
): {
  position: [number, number, number];
  size: [number, number, number];
  scale: [number, number, number];
  scaleOrigin: [number, number, number];
} {
  switch (orientation) {
    case 'xz':
      // Floor plane: spans X=[0..cols), Z=[0..rows), at Y=-depth
      // scaleOrigin Y=1 anchors the thin slab to the bottom edge
      return {
        position: [0, -depth, 0],
        size: [cols, 1, rows],
        scale: [1, 0.1, 1],
        scaleOrigin: [0.5, 1, 0.5],
      };
    case 'xy':
      // Front wall: spans X=[0..cols), Y=[0..rows), at Z=-depth
      // scaleOrigin Z=1 anchors the thin slab to the back edge
      return {
        position: [0, 0, -depth],
        size: [cols, rows, 1],
        scale: [1, 1, 0.1],
        scaleOrigin: [0.5, 0.5, 1],
      };
    case 'yz':
      // Side wall: spans Y=[0..cols), Z=[0..rows), at X=depth
      // scaleOrigin X=0 anchors the thin slab to the back edge
      return {
        position: [depth, 0, 0],
        size: [1, cols, rows],
        scale: [0.1, 1, 1],
        scaleOrigin: [0, 0.5, 0.5],
      };
  }
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
  } = getState();

  scene = new Heerich({
    tile: grid.tileSize,
    camera: cameraConfig(cameraType, grid.orientation, cameraAngleDelta),
  });

  const planeStyle = {
    top: {
      fill: 'rgba(255,255,255,0.12)',
      stroke: 'rgba(255,255,255,0.12)',
      strokeWidth: 1,
    },
    left: {
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.08)',
      strokeWidth: 1,
    },
    right: {
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.08)',
      strokeWidth: 1,
    },
    front: {
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.08)',
      strokeWidth: 1,
    },
    back: {
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.08)',
      strokeWidth: 1,
    },
    bottom: {
      fill: 'rgba(255,255,255,0.08)',
      stroke: 'rgba(255,255,255,0.08)',
      strokeWidth: 1,
    },
  };

  const strokeStyle = stroke ? { stroke: '#222', strokeWidth: 1 } : {};

  scene.batch(() => {
    // Add the semi-transparent active plane
    const plane = planePosition(
      activePlaneDepth,
      grid.cols,
      grid.rows,
      grid.orientation,
    );
    scene.addGeometry({
      type: 'box',
      position: plane.position,
      size: plane.size,
      scale: plane.scale,
      scaleOrigin: plane.scaleOrigin,
      opaque: false,
      style: planeStyle,
    } as Parameters<typeof scene.addGeometry>[0]);

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
            position: voxelPosition(
              cell.col,
              cell.row,
              y,
              path.depth,
              grid.orientation,
            ),
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
  height: number,
) {
  rebuildScene();

  ctx.clearRect(0, 0, width, height);

  // Fill with background color
  // const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1a1a2e";
  ctx.fillStyle = 'var(--bg, #1a1a2e)';
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
