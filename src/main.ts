import { ssam } from "ssam";
import type { Sketch, SketchSettings } from "ssam";
import { Pane } from "tweakpane";
import { renderScene, markDirty } from "./renderer.ts";
import {
  getState,
  getActivePath,
  setTileSize,
  setGridCols,
  setGridRows,
  setOrientation,
  setActivePath,
  setPathHeight,
  setPathColor,
  setStroke,
  setCameraType,
  setCameraAngleDelta,
  resetCameraAngle,
  setActivePlaneDepth,
  createPath,
  clearAllPaths,
  subscribe,
} from "./state.ts";
import type { CameraType, Orientation } from "./state.ts";
import { initGridEditor } from "./grid-editor.ts";
import { tryRestore, startAutoSave, exportJSON, importJSON } from "./storage.ts";
import "./index.css";

// Restore saved state from localStorage before reading PARAMS
tryRestore();

// Tweakpane setup
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer, title: "drawreerich" });

/** Return the depth axis label for the current orientation. */
function depthAxisLabel(orientation: Orientation): string {
  switch (orientation) {
    case "xz": return "depth (Y)";
    case "xy": return "depth (Z)";
    case "yz": return "depth (X)";
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
  .addBinding(PARAMS, "cols", { label: "cols", min: 4, max: 32, step: 1 })
  .on("change", (ev) => {
    setGridCols(ev.value);
  });

pane
  .addBinding(PARAMS, "rows", { label: "rows", min: 4, max: 32, step: 1 })
  .on("change", (ev) => {
    setGridRows(ev.value);
  });

pane.addBinding(PARAMS, "tileSize", { min: 8, max: 64, step: 1 }).on(
  "change",
  (ev) => {
    setTileSize(ev.value);
  }
);

pane
  .addBinding(PARAMS, "orientation", {
    label: "orientation",
    options: { XZ: "xz", XY: "xy", YZ: "yz" },
  })
  .on("change", (ev) => {
    setOrientation(ev.value as "xz" | "xy" | "yz");
    // Update depth slider label and value after orientation reset
    depthBinding.label = depthAxisLabel(ev.value as Orientation);
    PARAMS.activePlaneDepth = 0;
    depthBinding.refresh();
  });

pane
  .addBinding(PARAMS, "cameraType", {
    label: "camera",
    options: {
      Isometric: "isometric",
      Oblique: "oblique",
      Orthographic: "orthographic",
    },
  })
  .on("change", (ev) => {
    setCameraType(ev.value as CameraType);
  });

pane.addButton({ title: "Reset Camera" }).on("click", () => {
  resetCameraAngle();
});

const depthBinding = pane
  .addBinding(PARAMS, "activePlaneDepth", {
    label: depthAxisLabel(getState().grid.orientation),
    min: 0,
    max: 20,
    step: 1,
  })
  .on("change", (ev) => {
    setActivePlaneDepth(ev.value);
  });

pane.addBinding(PARAMS, "stroke", { label: "stroke" }).on("change", (ev) => {
  setStroke(ev.value);
});

// --- Active Path controls ---
const activePath = getActivePath();
const PATH_PARAMS = {
  height: activePath?.height ?? 2,
  color: activePath?.color ?? "#4477bb",
};

const pathFolder = pane.addFolder({ title: "Active Path" });

const heightBinding = pathFolder
  .addBinding(PATH_PARAMS, "height", {
    label: "height",
    min: 1,
    max: 10,
    step: 1,
  })
  .on("change", (ev) => {
    const ap = getActivePath();
    if (ap) setPathHeight(ap.id, ev.value);
  });

const colorBinding = pathFolder
  .addBinding(PATH_PARAMS, "color", { label: "color" })
  .on("change", (ev) => {
    const ap = getActivePath();
    if (ap) setPathColor(ap.id, ev.value);
  });

// "New Path" button
pathFolder.addButton({ title: "New Path" }).on("click", () => {
  createPath();
});

// --- Persistence controls ---
const fileFolder = pane.addFolder({ title: "File" });

fileFolder.addButton({ title: "Clear All" }).on("click", () => {
  if (confirm("Clear all paths? This cannot be undone.")) {
    clearAllPaths();
    syncParamsFromState();
  }
});

fileFolder.addButton({ title: "Export Image" }).on("click", () => {
  if (doExportFrame) doExportFrame();
});

fileFolder.addButton({ title: "Export JSON" }).on("click", () => {
  exportJSON();
});

fileFolder.addButton({ title: "Import JSON" }).on("click", () => {
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
    PATH_PARAMS.color = ap.color;
    heightBinding.refresh();
    colorBinding.refresh();
  }
}

// Path swatches
const swatchContainer = document.getElementById("path-swatches")!;

function renderSwatches() {
  const { paths, activePathId } = getState();
  swatchContainer.innerHTML = "";

  for (const path of paths) {
    const swatch = document.createElement("button");
    swatch.className = "path-swatch";
    if (path.id === activePathId) {
      swatch.classList.add("active");
    }
    swatch.style.backgroundColor = path.color;
    swatch.title = path.id;
    swatch.addEventListener("click", () => {
      setActivePath(path.id);
    });
    swatchContainer.appendChild(swatch);
  }
}

renderSwatches();
subscribe(() => renderSwatches());

// Sync active path controls when active path changes
let prevActiveId = getState().activePathId;
subscribe(() => {
  const ap = getActivePath();
  if (!ap) return;
  // Only refresh bindings when active path switches or its properties change externally
  if (ap.id !== prevActiveId) {
    prevActiveId = ap.id;
    PATH_PARAMS.height = ap.height;
    PATH_PARAMS.color = ap.color;
    heightBinding.refresh();
    colorBinding.refresh();
  }
});

// Mark 3D renderer dirty when state changes
subscribe(() => markDirty());

// Responsive sidebar toggle
const menuButton = document.getElementById("menu-button")!;
const overlayBackdrop = document.getElementById("overlay-backdrop")!;
const appEl = document.getElementById("app")!;
const settingsPanel = document.getElementById("settings-panel") as HTMLDetailsElement;
const settingsSummary = settingsPanel.querySelector(".settings-toggle") as HTMLElement;

function openSidebar(): void {
  settingsPanel.open = true;
  appEl.classList.add("sidebar-open");
}

function closeSidebar(): void {
  appEl.classList.remove("sidebar-open");
}

menuButton.addEventListener("click", openSidebar);
overlayBackdrop.addEventListener("click", closeSidebar);

settingsSummary.addEventListener("click", (e) => {
  e.preventDefault();
  closeSidebar();
});

// Open panel by default on large screens
if (window.matchMedia("(min-width: 768px)").matches) {
  openSidebar();
}

// Grid editor
const gridContainer = document.getElementById("grid-editor-container")!;
initGridEditor(gridContainer);

// Start auto-saving state to localStorage
startAutoSave();

// Ssam sketch
let doExportFrame: (() => void) | null = null;

const sketch: Sketch<"2d"> = ({ wrap, context: ctx, width, height, exportFrame, canvas }) => {
  doExportFrame = exportFrame;
  renderScene(ctx, width, height);

  // Camera rotation via pointer drag
  let isDragging = false;
  let dragStartX = 0;
  let dragStartDelta = 0;

  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartDelta = getState().cameraAngleDelta;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    // Convert pixels to degrees: ~0.5° per pixel
    const newDelta = dragStartDelta + dx * 0.5;
    setCameraAngleDelta(newDelta);
    markDirty();
  });

  canvas.addEventListener("pointerup", (e: PointerEvent) => {
    if (isDragging) {
      isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener("pointercancel", (e: PointerEvent) => {
    if (isDragging) {
      isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", () => { canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointerup", () => { canvas.style.cursor = "grab"; });
  canvas.addEventListener("pointercancel", () => { canvas.style.cursor = "grab"; });

  wrap.render = () => {
    renderScene(ctx, width, height);
  };
};

const settings: SketchSettings = {
  parent: "#canvas-container",
  pixelRatio: window.devicePixelRatio,
  mode: "2d",
  animate: true,
};

ssam(sketch, settings);
