import { ssam } from "ssam";
import type { Sketch, SketchSettings } from "ssam";
import { Pane } from "tweakpane";
import { renderScene, markDirty } from "./renderer.ts";
import {
  getState,
  setTileSize,
  setGridCols,
  setGridRows,
  setOrientation,
  setActivePath,
  createPath,
  subscribe,
} from "./state.ts";
import { initGridEditor } from "./grid-editor.ts";
import "./index.css";

// Tweakpane setup
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer, title: "drawreerich" });

const PARAMS = {
  cols: getState().grid.cols,
  rows: getState().grid.rows,
  tileSize: getState().grid.tileSize,
  orientation: getState().grid.orientation,
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

// "New Path" button
pane.addButton({ title: "New Path" }).on("click", () => {
  createPath();
});

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

// Mark 3D renderer dirty when state changes
subscribe(() => markDirty());

// Grid editor
const gridContainer = document.getElementById("grid-editor-container")!;
initGridEditor(gridContainer);

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
