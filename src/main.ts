import { ssam } from 'ssam';
import type { Sketch, SketchSettings } from 'ssam';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { renderScene, markDirty, setShowPlane } from './renderer.ts';
import {
  getState,
  getActivePath,
  setTileSize,
  setGridCols,
  setGridRows,
  setOrientation,
  setPathHeight,
  setPathColor,
  setStroke,
  setCameraType,
  setCameraAngleDelta,
  resetCameraAngle,
  setActivePlaneDepth,
  createPath,
  clearAllPaths,
  setPathColorSource,
  replaceState,
  subscribe,
} from './state.ts';
import type { CameraType, Orientation } from './state.ts';
import { GridEditorBladePlugin } from './grid-editor-plugin.ts';
import {
  tryRestore,
  startAutoSave,
  exportJSON,
  importJSON,
} from './storage.ts';
import './index.css';
import { generatePalette } from './palette.ts';

/** Seed the canvas with Tetris-style pieces on first visit. */
function loadDefaultComposition(colors: string[]) {
  const c = (i: number) => colors[i % colors.length] ?? '#4477bb';
  replaceState(
    { cols: 16, rows: 16, tileSize: 32, orientation: 'xz' },
    [
      // I piece – horizontal bar
      { id: 'path-1', color: c(0), height: 2, depth: 0, cells: [
        { col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 },
      ] },
      // O piece – 2×2 square
      { id: 'path-2', color: c(1), height: 4, depth: 0, cells: [
        { col: 7, row: 10 }, { col: 8, row: 10 }, { col: 7, row: 11 }, { col: 8, row: 11 },
      ] },
      // T piece – stem pointing down
      { id: 'path-3', color: c(2), height: 3, depth: 0, cells: [
        { col: 4, row: 3 }, { col: 5, row: 3 }, { col: 6, row: 3 }, { col: 5, row: 4 },
      ] },
      // L piece
      { id: 'path-4', color: c(3), height: 3, depth: 0, cells: [
        { col: 8, row: 3 }, { col: 8, row: 4 }, { col: 8, row: 5 }, { col: 9, row: 5 },
      ] },
      // Z piece
      { id: 'path-5', color: c(4), height: 2, depth: 0, cells: [
        { col: 2, row: 10 }, { col: 3, row: 10 }, { col: 3, row: 11 }, { col: 4, row: 11 },
      ] },
    ]
  );
}

// Restore saved state from localStorage before reading PARAMS
const hasRestoredState = tryRestore();

// Start auto-saving state to localStorage (before loading default so it gets persisted)
startAutoSave();

// Initialize colour palette
let currentPalette = generatePalette();
setPathColorSource(currentPalette.pathColors);
document.documentElement.style.setProperty("--bg", currentPalette.background);

if (!hasRestoredState) {
  // First visit — seed with a Tetris-style default composition
  loadDefaultComposition(currentPalette.pathColors);
} else {
  // Recolour the initial path with the first palette path colour
  const initPath = getActivePath();
  if (initPath) {
    setPathColor(initPath.id, currentPalette.pathColors[0]);
  }
}

/** Apply a new palette: update background, recolour all existing paths. */
function applyPalette() {
  currentPalette = generatePalette();
  setPathColorSource(currentPalette.pathColors);
  document.documentElement.style.setProperty("--bg", currentPalette.background);

  // Recolour all existing paths by cycling through palette colours
  const { paths } = getState();
  for (let i = 0; i < paths.length; i++) {
    const color = currentPalette.pathColors[i % currentPalette.pathColors.length];
    setPathColor(paths[i].id, color);
  }
}

// Tweakpane setup
const paneContainer = document.getElementById('tweakpane-container')!;
const pane = new Pane({ container: paneContainer, title: 'drawreerich' });
pane.registerPlugin(EssentialsPlugin);
pane.registerPlugin(GridEditorBladePlugin);

/** Return the depth axis label for the current orientation. */
function depthAxisLabel(orientation: Orientation): string {
  switch (orientation) {
    case 'xz':
      return 'depth (Y)';
    case 'xy':
      return 'depth (Z)';
    case 'yz':
      return 'depth (X)';
  }
}

const PARAMS = {
  cols: getState().grid.cols,
  rows: getState().grid.rows,
  tileSize: getState().grid.tileSize,
  orientation: getState().grid.orientation,
  cameraType: getState().cameraType,
  stroke: getState().stroke,
  activePlaneDepth: getState().activePlaneDepth,
};

pane
  .addBinding(PARAMS, 'cols', { label: 'cols', min: 4, max: 32, step: 1 })
  .on('change', (ev) => {
    setGridCols(ev.value);
  });

pane
  .addBinding(PARAMS, 'rows', { label: 'rows', min: 4, max: 32, step: 1 })
  .on('change', (ev) => {
    setGridRows(ev.value);
  });

pane
  .addBinding(PARAMS, 'tileSize', { min: 8, max: 64, step: 1 })
  .on('change', (ev) => {
    setTileSize(ev.value);
  });

pane
  .addBinding(PARAMS, 'orientation', {
    label: 'orientation',
    view: 'radiogrid',
    groupName: 'scale',
    size: [3, 1],
    cells: (x: number) =>
      [
        { title: 'XZ', value: 'xz' },
        { title: 'XY', value: 'xy' },
        { title: 'YZ', value: 'yz' },
      ][x],
  })
  .on('change', (ev) => {
    setOrientation(ev.value as 'xz' | 'xy' | 'yz');
    // Update depth slider label and value after orientation reset
    depthBinding.label = depthAxisLabel(ev.value as Orientation);
    PARAMS.activePlaneDepth = 0;
    depthBinding.refresh();
  });

pane
  .addBinding(PARAMS, 'cameraType', {
    label: 'camera',
    options: {
      Isometric: 'isometric',
      Oblique: 'oblique',
      Orthographic: 'orthographic',
    },
  })
  .on('change', (ev) => {
    setCameraType(ev.value as CameraType);
  });

pane.addButton({ title: 'Reset Camera' }).on('click', () => {
  resetCameraAngle();
});

const depthBinding = pane
  .addBinding(PARAMS, 'activePlaneDepth', {
    label: depthAxisLabel(getState().grid.orientation),
    min: 0,
    max: 20,
    step: 1,
  })
  .on('change', (ev) => {
    setActivePlaneDepth(ev.value);
  });

pane.addBinding(PARAMS, 'stroke', { label: 'stroke' }).on('change', (ev) => {
  setStroke(ev.value);
});

// --- Active Path controls ---
const activePath = getActivePath();
const PATH_PARAMS = {
  height: activePath?.height ?? 2,
  color: activePath?.color ?? '#4477bb',
};

const pathFolder = pane.addFolder({ title: 'Active Path' });

const heightBinding = pathFolder
  .addBinding(PATH_PARAMS, 'height', {
    label: 'height',
    min: 1,
    max: 10,
    step: 1,
  })
  .on('change', (ev) => {
    const ap = getActivePath();
    if (ap) setPathHeight(ap.id, ev.value);
  });

pathFolder
  .addBinding(PATH_PARAMS, 'color', { label: 'color' })
  .on('change', (ev) => {
    const ap = getActivePath();
    if (ap) setPathColor(ap.id, ev.value);
  });

// "New Path" button
pathFolder.addButton({ title: 'New Path' }).on('click', () => {
  createPath();
});

pathFolder.addBlade({ view: 'grid-editor' });

// --- Persistence controls ---
const fileFolder = pane.addFolder({ title: 'File' });

fileFolder.addButton({ title: "Regenerate Palette" }).on("click", () => {
  applyPalette();
});

fileFolder.addButton({ title: 'Load Demo' }).on('click', () => {
  loadDefaultComposition(currentPalette.pathColors);
  syncParamsFromState();
});

fileFolder.addButton({ title: 'Clear All' }).on('click', () => {
  if (confirm('Clear all paths? This cannot be undone.')) {
    clearAllPaths();
    syncParamsFromState();
  }
});

fileFolder.addButton({ title: 'Export Image' }).on('click', () => {
  const canvas = document.querySelector<HTMLCanvasElement>('#canvas-container canvas');
  if (!canvas || !lastLogicalWidth || !lastLogicalHeight) return;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return;
  const pr = window.devicePixelRatio;
  setShowPlane(false);
  markDirty();
  // Apply the same pixel-ratio scale ssam uses so rendering coordinates match
  ctx2d.save();
  ctx2d.setTransform(pr, 0, 0, pr, 0, 0);
  renderScene(ctx2d, lastLogicalWidth, lastLogicalHeight);
  ctx2d.restore();
  setShowPlane(true);
  markDirty();
  const link = document.createElement('a');
  link.download = 'drawreerich.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

fileFolder.addButton({ title: 'Export JSON' }).on('click', () => {
  exportJSON();
});

fileFolder.addButton({ title: 'Import JSON' }).on('click', () => {
  importJSON()
    .then(() => {
      syncParamsFromState();
    })
    .catch((err: Error) => {
      alert(err.message);
    });
});

// --- Sync Tweakpane PARAMS from state (after restore or import) ---
function syncParamsFromState() {
  const s = getState();
  PARAMS.cols = s.grid.cols;
  PARAMS.rows = s.grid.rows;
  PARAMS.tileSize = s.grid.tileSize;
  PARAMS.orientation = s.grid.orientation;
  PARAMS.cameraType = s.cameraType;
  PARAMS.stroke = s.stroke;
  PARAMS.activePlaneDepth = s.activePlaneDepth;
  depthBinding.label = depthAxisLabel(s.grid.orientation);
  pane.refresh();

  const ap = getActivePath();
  if (ap) {
    PATH_PARAMS.height = ap.height;
    heightBinding.refresh();
  }
}

// Sync active path controls when active path changes
let prevActiveId = getState().activePathId;
subscribe(() => {
  const ap = getActivePath();
  if (!ap) return;
  // Only refresh bindings when active path switches or its properties change externally
  if (ap.id !== prevActiveId) {
    prevActiveId = ap.id;
    PATH_PARAMS.height = ap.height;
    heightBinding.refresh();
  }
});

// Mark 3D renderer dirty when state changes
subscribe(() => markDirty());

// Ssam sketch
// Track logical dimensions for export (canvas.width/height are physical pixels × pixelRatio)
let lastLogicalWidth = 0;
let lastLogicalHeight = 0;

const sketch: Sketch<'2d'> = ({
  wrap,
  context: ctx,
  width,
  height,
  canvas,
}) => {
  lastLogicalWidth = width;
  lastLogicalHeight = height;
  renderScene(ctx, width, height);

  // Camera rotation via pointer drag
  let isDragging = false;
  let dragStartX = 0;
  let dragStartDelta = 0;

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartDelta = getState().cameraAngleDelta;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    // Convert pixels to degrees: ~0.5° per pixel
    const newDelta = dragStartDelta + dx * 0.5;
    setCameraAngleDelta(newDelta);
    markDirty();
  });

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    if (isDragging) {
      isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointercancel', (e: PointerEvent) => {
    if (isDragging) {
      isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', () => {
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointerup', () => {
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('pointercancel', () => {
    canvas.style.cursor = 'grab';
  });

  wrap.render = ({ width: w, height: h }: { width: number; height: number }) => {
    lastLogicalWidth = w;
    lastLogicalHeight = h;
    renderScene(ctx, w, h);
  };

  wrap.resize = ({ width: w, height: h }: { width: number; height: number }) => {
    markDirty();
    lastLogicalWidth = w;
    lastLogicalHeight = h;
    renderScene(ctx, w, h);
  };
};

const settings: SketchSettings = {
  parent: '#canvas-container',
  pixelRatio: window.devicePixelRatio,
  mode: '2d',
  animate: true,
};

ssam(sketch, settings);
