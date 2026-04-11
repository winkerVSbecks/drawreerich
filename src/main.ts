import { ssam } from "ssam";
import type { Sketch, SketchSettings } from "ssam";
import { Pane } from "tweakpane";
import { renderScene } from "./renderer.ts";
import "./index.css";

// Tweakpane setup
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer, title: "drawreerich" });

const PARAMS = {
  tileSize: 32,
};

pane.addBinding(PARAMS, "tileSize", { min: 8, max: 64, step: 1 });

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
