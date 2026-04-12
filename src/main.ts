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
  createPath,
  subscribe,
} from "./state.ts";
import type { CameraType } from "./state.ts";
import { initGridEditor } from "./grid-editor.ts";
import { tryRestore, startAutoSave, exportJSON, importJSON } from "./storage.ts";
import "./index.css";

// Restore saved state from localStorage before reading PARAMS
tryRestore();

// Tweakpane setup
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer, title: "drawreerich" });

const PARAMS = {
  cols: getState().grid.cols,
  rows: getState().grid.rows,
  tileSize: getState().grid.tileSize,
  orientation: getState().grid.orientation,
  cameraType: getState().cameraType,
  stroke: getState().stroke,
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

// Grid editor
const gridContainer = document.getElementById("grid-editor-container")!;
initGridEditor(gridContainer);

// Start auto-saving state to localStorage
startAutoSave();

// Ssam sketch
const sketch: Sketch<"2d"> = ({ wrap, context: ctx, width, height }) => {
  renderScene(ctx, width, height);

  wrap.render = () => {
    renderScene(ctx, width, height);
  };
};

const settings: SketchSettings = {
  parent: "#canvas-container",
  dimensions: [600, 600],
  pixelRatio: window.devicePixelRatio,
  mode: "2d",
  animate: true,
};

ssam(sketch, settings);
