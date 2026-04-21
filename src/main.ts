import { ssam } from 'ssam';
import type { Sketch, SketchSettings } from 'ssam';
import { Pane } from 'tweakpane';
import type { BladeApi } from '@tweakpane/core';
import {
  renderScene,
  markDirty,
  setShowPlane,
  toggleShowPlane,
  hitTestVoxel,
} from './renderer.ts';
import {
  getState,
  getActivePath,
  setActivePath,
  clearActivePath,
  setTileSize,
  setGridCols,
  setGridRows,
  setRotation,
  setPathHeight,
  setPathColor,
  setStroke,
  setCameraType,
  setCameraAngleDelta,
  setCameraDistance,
  setCameraPitch,
  resetCameraAngle,
  setActivePlaneDepth,
  createPath,
  clearAllPaths,
  setPathColorSource,
  replaceState,
  subscribe,
  ROTATION_PRESETS,
  CAMERA_DEFAULTS,
} from './state.ts';
import type { CameraType } from './state.ts';
import { GridEditorBladePlugin } from './grid-editor-plugin.ts';
import {
  ColorSwatchesBladePlugin,
  registerColorSwatchesSource,
  refreshColorSwatches,
} from './color-swatches-plugin.ts';
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
  replaceState({ cols: 16, rows: 16, tileSize: 32 }, [
    // I piece – horizontal bar
    {
      id: 'path-1',
      color: c(0),
      height: 2,
      depth: 0,
      cells: [
        { col: 1, row: 7 },
        { col: 2, row: 7 },
        { col: 3, row: 7 },
        { col: 4, row: 7 },
      ],
    },
    // O piece – 2×2 square
    {
      id: 'path-2',
      color: c(1),
      height: 4,
      depth: 0,
      cells: [
        { col: 7, row: 10 },
        { col: 8, row: 10 },
        { col: 7, row: 11 },
        { col: 8, row: 11 },
      ],
    },
    // T piece – stem pointing down
    {
      id: 'path-3',
      color: c(2),
      height: 3,
      depth: 0,
      cells: [
        { col: 4, row: 3 },
        { col: 5, row: 3 },
        { col: 6, row: 3 },
        { col: 5, row: 4 },
      ],
    },
    // L piece
    {
      id: 'path-4',
      color: c(3),
      height: 3,
      depth: 0,
      cells: [
        { col: 8, row: 3 },
        { col: 8, row: 4 },
        { col: 8, row: 5 },
        { col: 9, row: 5 },
      ],
    },
    // Z piece
    {
      id: 'path-5',
      color: c(4),
      height: 2,
      depth: 0,
      cells: [
        { col: 2, row: 10 },
        { col: 3, row: 10 },
        { col: 3, row: 11 },
        { col: 4, row: 11 },
      ],
    },
  ]);
}

// Restore saved state from localStorage before reading PARAMS
const hasRestoredState = tryRestore();

// Start auto-saving state to localStorage (before loading default so it gets persisted)
startAutoSave();

// Initialize colour palette
let currentPalette = generatePalette();
setPathColorSource(currentPalette.pathColors);
document.documentElement.style.setProperty('--bg', currentPalette.background);

registerColorSwatchesSource({
  palette: () => currentPalette.pathColors,
  current: () => getActivePath()?.color ?? '#4477bb',
  onChange: (color) => {
    const ap = getActivePath();
    if (ap) setPathColor(ap.id, color);
  },
});

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
  document.documentElement.style.setProperty('--bg', currentPalette.background);

  // Recolour all existing paths by cycling through palette colours
  const { paths } = getState();
  for (let i = 0; i < paths.length; i++) {
    const color =
      currentPalette.pathColors[i % currentPalette.pathColors.length];
    setPathColor(paths[i].id, color);
  }

  // Plane stroke contrast depends on --bg; force a rebuild even when no paths changed.
  markDirty();
  refreshColorSwatches();
}

// Tweakpane setup — one pane per top-bar menu
const PARAMS = {
  cols: getState().grid.cols,
  rows: getState().grid.rows,
  tileSize: getState().grid.tileSize,
  cameraType: getState().cameraType,
  cameraDistance: getState().cameraDistance,
  cameraPitch: getState().cameraPitch,
  stroke: getState().stroke,
  activePlaneDepth: getState().activePlaneDepth,
};

const ROT_PARAMS = {
  rotX: getState().rotation.x,
  rotY: getState().rotation.y,
  rotZ: getState().rotation.z,
};

const activePath = getActivePath();
const PATH_PARAMS = {
  height: activePath?.height ?? 2,
};

// --- Artboard ---
const artboardPane = new Pane({
  container: document.getElementById('pane-artboard')!,
});

artboardPane
  .addBinding(PARAMS, 'cols', { label: 'cols', min: 4, max: 32, step: 1 })
  .on('change', (ev) => {
    setGridCols(ev.value);
  });

artboardPane
  .addBinding(PARAMS, 'rows', { label: 'rows', min: 4, max: 32, step: 1 })
  .on('change', (ev) => {
    setGridRows(ev.value);
  });

artboardPane
  .addBinding(PARAMS, 'tileSize', { min: 8, max: 64, step: 1 })
  .on('change', (ev) => {
    setTileSize(ev.value);
  });

// --- Camera ---
const cameraPane = new Pane({
  container: document.getElementById('pane-camera')!,
});

cameraPane
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
    syncCameraTypeSpecific();
  });

const distanceBinding = cameraPane
  .addBinding(PARAMS, 'cameraDistance', {
    label: 'distance',
    min: 2,
    max: 40,
    step: 0.5,
  })
  .on('change', (ev) => {
    setCameraDistance(ev.value);
  });

const pitchBinding = cameraPane
  .addBinding(PARAMS, 'cameraPitch', {
    label: 'pitch',
    min: 0,
    max: 89,
    step: 1,
  })
  .on('change', (ev) => {
    setCameraPitch(ev.value);
  });

function syncCameraTypeSpecific() {
  const type = getState().cameraType;
  (distanceBinding as BladeApi & { hidden: boolean }).hidden =
    type !== 'oblique';
  (pitchBinding as BladeApi & { hidden: boolean }).hidden =
    type !== 'orthographic';
}

syncCameraTypeSpecific();

function resetCamera() {
  setRotation(ROTATION_PRESETS.xz);
  resetCameraAngle();
  setCameraDistance(CAMERA_DEFAULTS.distance);
  setCameraPitch(CAMERA_DEFAULTS.pitch);
  syncParamsFromState();
}

cameraPane.addButton({ title: 'Reset Camera' }).on('click', () => {
  resetCamera();
});

cameraPane.addButton({ title: 'Floor (XZ)' }).on('click', () => {
  setRotation(ROTATION_PRESETS.xz);
  setCameraAngleDelta(0);
  syncParamsFromState();
});
cameraPane.addButton({ title: 'Front (XY)' }).on('click', () => {
  setRotation(ROTATION_PRESETS.xy);
  setCameraAngleDelta(-15);
  syncParamsFromState();
});
cameraPane.addButton({ title: 'Side (YZ)' }).on('click', () => {
  setRotation(ROTATION_PRESETS.yz);
  setCameraAngleDelta(15);
  syncParamsFromState();
});

cameraPane
  .addBinding(ROT_PARAMS, 'rotX', { label: 'X', min: 0, max: 3, step: 1 })
  .on('change', (ev) => {
    const r = getState().rotation;
    setRotation({ ...r, x: ev.value });
  });
cameraPane
  .addBinding(ROT_PARAMS, 'rotY', { label: 'Y', min: 0, max: 3, step: 1 })
  .on('change', (ev) => {
    const r = getState().rotation;
    setRotation({ ...r, y: ev.value });
  });
cameraPane
  .addBinding(ROT_PARAMS, 'rotZ', { label: 'Z', min: 0, max: 3, step: 1 })
  .on('change', (ev) => {
    const r = getState().rotation;
    setRotation({ ...r, z: ev.value });
  });

// --- Draw ---
const drawPane = new Pane({ container: document.getElementById('pane-draw')! });
drawPane.registerPlugin(GridEditorBladePlugin);
drawPane.registerPlugin(ColorSwatchesBladePlugin);

drawPane.addBlade({ view: 'grid-editor' });

drawPane
  .addBinding(PARAMS, 'activePlaneDepth', {
    label: 'depth (Y)',
    min: 0,
    max: 20,
    step: 1,
  })
  .on('change', (ev) => {
    setActivePlaneDepth(ev.value);
  });

const heightBinding = drawPane
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

drawPane
  .addBinding(PARAMS, 'stroke', { label: 'stroke' })
  .on('change', (ev) => {
    setStroke(ev.value);
  });

drawPane.addBlade({ view: 'color-swatches', label: 'color' });

drawPane.addButton({ title: 'New Path' }).on('click', () => {
  createPath();
});

const settingsPanes = [artboardPane, cameraPane, drawPane];

// --- Sync Tweakpane PARAMS from state (after restore or import) ---
function syncParamsFromState() {
  const s = getState();
  PARAMS.cols = s.grid.cols;
  PARAMS.rows = s.grid.rows;
  PARAMS.tileSize = s.grid.tileSize;
  PARAMS.cameraType = s.cameraType;
  PARAMS.cameraDistance = s.cameraDistance;
  PARAMS.cameraPitch = s.cameraPitch;
  PARAMS.stroke = s.stroke;
  PARAMS.activePlaneDepth = s.activePlaneDepth;
  ROT_PARAMS.rotX = s.rotation.x;
  ROT_PARAMS.rotY = s.rotation.y;
  ROT_PARAMS.rotZ = s.rotation.z;
  for (const p of settingsPanes) p.refresh();
  syncCameraTypeSpecific();
  refreshColorSwatches();

  const ap = getActivePath();
  if (ap) {
    PATH_PARAMS.height = ap.height;
    heightBinding.refresh();
  }
}

// Sync active path controls when active path changes
let prevActiveId = getState().activePathId;
let prevActiveColor = getActivePath()?.color ?? '';
subscribe(() => {
  const ap = getActivePath();
  if (!ap) return;
  // Only refresh bindings when active path switches or its properties change externally
  if (ap.id !== prevActiveId) {
    prevActiveId = ap.id;
    PATH_PARAMS.height = ap.height;
    heightBinding.refresh();
  }
  if (ap.color !== prevActiveColor) {
    prevActiveColor = ap.color;
    refreshColorSwatches();
  }
});

// Mark 3D renderer dirty when state changes
subscribe(() => markDirty());

// --- Top-bar wiring: About dialog, File menu, modal helpers ---

const aboutDialog = document.getElementById(
  'about-dialog',
) as HTMLDialogElement;
const aboutButton = document.getElementById('about-button')!;
aboutButton.addEventListener('click', () => {
  aboutDialog.showModal();
});

const confirmDialog = document.getElementById(
  'confirm-dialog',
) as HTMLDialogElement;
const confirmTitle = confirmDialog.querySelector(
  '.confirm-title',
) as HTMLElement;
const confirmBody = confirmDialog.querySelector('.confirm-body') as HTMLElement;
const confirmButton = confirmDialog.querySelector<HTMLButtonElement>(
  '[data-confirm-action="confirm"]',
)!;
const confirmCancel = confirmDialog.querySelector<HTMLButtonElement>(
  '[data-confirm-action="cancel"]',
)!;

function askConfirm(
  title: string,
  message: string,
  confirmLabel = 'Confirm',
): Promise<boolean> {
  confirmTitle.textContent = title;
  confirmBody.textContent = message;
  confirmButton.textContent = confirmLabel;
  confirmDialog.showModal();
  return new Promise<boolean>((resolve) => {
    const done = (result: boolean) => {
      confirmButton.removeEventListener('click', onConfirm);
      confirmCancel.removeEventListener('click', onCancel);
      confirmDialog.removeEventListener('cancel', onCancel);
      if (confirmDialog.open) confirmDialog.close();
      resolve(result);
    };
    const onConfirm = () => done(true);
    const onCancel = (e: Event) => {
      e.preventDefault();
      done(false);
    };
    confirmButton.addEventListener('click', onConfirm);
    confirmCancel.addEventListener('click', onCancel);
    confirmDialog.addEventListener('cancel', onCancel);
  });
}

const alertDialog = document.getElementById(
  'alert-dialog',
) as HTMLDialogElement;
const alertTitle = alertDialog.querySelector('.confirm-title') as HTMLElement;
const alertBody = alertDialog.querySelector('.alert-body') as HTMLElement;
const alertOk = alertDialog.querySelector<HTMLButtonElement>(
  '[data-alert-action="ok"]',
)!;

function showAlert(title: string, message: string): Promise<void> {
  alertTitle.textContent = title;
  alertBody.textContent = message;
  alertDialog.showModal();
  return new Promise<void>((resolve) => {
    const done = () => {
      alertOk.removeEventListener('click', done);
      if (alertDialog.open) alertDialog.close();
      resolve();
    };
    alertOk.addEventListener('click', done);
  });
}

// Settings menus — only one <details> open at a time
const settingsMenus = Array.from(
  document.querySelectorAll<HTMLDetailsElement>('.settings-menu'),
);

function closeAllSettingsMenus() {
  for (const m of settingsMenus) m.open = false;
}

for (const menu of settingsMenus) {
  menu.addEventListener('toggle', () => {
    if (!menu.open) return;
    for (const other of settingsMenus) {
      if (other !== menu) other.open = false;
    }
    setFileMenuOpen(false);
  });
}

// File menu
const fileMenuButton = document.getElementById(
  'file-menu-button',
) as HTMLButtonElement;
const fileMenu = document.getElementById('file-menu') as HTMLElement;

function setFileMenuOpen(open: boolean) {
  fileMenu.hidden = !open;
  fileMenuButton.setAttribute('aria-expanded', String(open));
  if (open) closeAllSettingsMenus();
}

fileMenuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  setFileMenuOpen(Boolean(fileMenu.hidden));
});

document.addEventListener('click', (e) => {
  const target = e.target as Node;
  if (
    !fileMenu.hidden &&
    !fileMenu.contains(target) &&
    target !== fileMenuButton
  ) {
    setFileMenuOpen(false);
  }
  for (const menu of settingsMenus) {
    if (menu.open && !menu.contains(target)) menu.open = false;
  }
});

async function runFileAction(action: string) {
  setFileMenuOpen(false);
  switch (action) {
    case 'load-demo':
      loadDefaultComposition(currentPalette.pathColors);
      syncParamsFromState();
      break;
    case 'regenerate-palette':
      applyPalette();
      break;
    case 'clear-all': {
      const ok = await askConfirm(
        'Clear all paths?',
        'This will remove every path on the canvas. This cannot be undone.',
        'Clear all',
      );
      if (ok) {
        clearAllPaths();
        syncParamsFromState();
      }
      break;
    }
    case 'import-json':
      try {
        await importJSON();
        syncParamsFromState();
      } catch (err) {
        await showAlert('Import failed', (err as Error).message);
      }
      break;
    case 'export-json':
      exportJSON();
      break;
    case 'export-image': {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '#canvas-container canvas',
      );
      if (!canvas || !lastLogicalWidth || !lastLogicalHeight) return;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;
      const pr = window.devicePixelRatio;
      setShowPlane(false);
      markDirty();
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
      break;
    }
  }
}

fileMenu.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
    'button[role="menuitem"]',
  );
  if (!target) return;
  const action = target.dataset.action;
  if (action) void runFileAction(action);
});

// Keyboard shortcuts
function toggleSettingsMenuByName(name: string) {
  const menu = settingsMenus.find((m) => m.dataset.menu === name);
  if (!menu) return;
  menu.open = !menu.open;
}

function openSettingsMenuByName(name: string) {
  const menu = settingsMenus.find((m) => m.dataset.menu === name);
  if (!menu || menu.open) return;
  menu.open = true;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    let handled = false;
    if (!fileMenu.hidden) {
      setFileMenuOpen(false);
      handled = true;
    }
    if (settingsMenus.some((m) => m.open)) {
      closeAllSettingsMenus();
      handled = true;
    }
    if (handled) e.stopPropagation();
    return;
  }
  // Skip shortcuts while typing in an input
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  ) {
    return;
  }
  // Skip when modifier keys are held or a dialog is open
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (aboutDialog.open || confirmDialog.open || alertDialog.open) return;

  if (e.key === '?') {
    aboutDialog.showModal();
    e.preventDefault();
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'f':
      setFileMenuOpen(Boolean(fileMenu.hidden));
      e.preventDefault();
      break;
    case 'a':
      toggleSettingsMenuByName('artboard');
      e.preventDefault();
      break;
    case 'c':
      toggleSettingsMenuByName('camera');
      e.preventDefault();
      break;
    case 'd':
      toggleSettingsMenuByName('draw');
      e.preventDefault();
      break;
    case 'r':
      resetCamera();
      e.preventDefault();
      break;
    case 'g':
      toggleShowPlane();
      markDirty();
      e.preventDefault();
      break;
    case 'p':
      applyPalette();
      e.preventDefault();
      break;
  }
});

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

  // Camera rotation via pointer drag; a pointerup with <CLICK_THRESHOLD px of
  // movement is treated as a click and runs a voxel hit-test instead.
  const CLICK_THRESHOLD = 3;
  let isDown = false;
  let startX = 0;
  let startY = 0;
  let dragStartDelta = 0;
  let exceededClickThreshold = false;

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    isDown = true;
    exceededClickThreshold = false;
    startX = e.clientX;
    startY = e.clientY;
    dragStartDelta = getState().cameraAngleDelta;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!exceededClickThreshold && Math.hypot(dx, dy) > CLICK_THRESHOLD) {
      exceededClickThreshold = true;
    }
    if (!exceededClickThreshold) return;
    const newDelta = dragStartDelta + dx * 0.5;
    setCameraAngleDelta(newDelta);
    markDirty();
  });

  canvas.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDown) return;
    isDown = false;
    canvas.releasePointerCapture(e.pointerId);
    if (exceededClickThreshold) return;
    // Treat as click — hit-test against voxels
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pathId = hitTestVoxel(x, y);
    if (pathId) {
      setActivePath(pathId);
      openSettingsMenuByName('draw');
      // The browser dispatches a `click` right after this pointerup; the
      // document-level click handler would otherwise close the menu we just
      // opened because the canvas is outside it.
      document.addEventListener('click', (ev) => ev.stopPropagation(), {
        capture: true,
        once: true,
      });
    } else {
      clearActivePath();
    }
  });

  canvas.addEventListener('pointercancel', (e: PointerEvent) => {
    if (isDown) {
      isDown = false;
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

  wrap.render = ({
    width: w,
    height: h,
  }: {
    width: number;
    height: number;
  }) => {
    lastLogicalWidth = w;
    lastLogicalHeight = h;
    renderScene(ctx, w, h);
  };

  wrap.resize = ({
    width: w,
    height: h,
  }: {
    width: number;
    height: number;
  }) => {
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
