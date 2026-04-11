import { ssam } from "ssam";
import type { Sketch, SketchSettings } from "ssam";
import { Pane } from "tweakpane";
import { renderScene, markDirty } from "./renderer.ts";
import {
  getState,
  setTileSize,
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
  tileSize: getState().grid.tileSize,
};

pane.addBinding(PARAMS, "tileSize", { min: 8, max: 64, step: 1 }).on(
  "change",
  (ev) => {
    setTileSize(ev.value);
  }
);

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
