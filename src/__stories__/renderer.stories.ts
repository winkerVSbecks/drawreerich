import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect } from "storybook/test";
import { renderScene, markDirty } from "../renderer.ts";
import { replaceState, addCell, setCameraAngleDelta, setActivePlaneDepth, setStroke } from "../state.ts";
import { resetState, hasVisiblePixels } from "./helpers.ts";

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return canvas;
}

const meta: Meta = {
  title: "Renderer",
};

export default meta;

type Story = StoryObj;

export const ClearsCanvasWhenNoCells: Story = {
  render: () => {
    resetState();
    markDirty();
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext("2d")!;
    // Draw something first to verify it gets cleared
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 200, 200);
    renderScene(ctx, 200, 200);
    return canvas;
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, 200, 200).data;
    // Verify the pre-drawn red content was cleared (no fully red pixels remain)
    let hasRedPixel = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 255) {
        hasRedPixel = true;
        break;
      }
    }
    await expect(hasRedPixel).toBe(false);
  },
};

export const RendersVisibleContentWithCells: Story = {
  render: () => {
    resetState();
    addCell(4, 4);
    markDirty();
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext("2d")!;
    renderScene(ctx, 600, 600);
    return canvas;
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    await expect(hasVisiblePixels(ctx, 600, 600)).toBe(true);
  },
};

export const DifferentOrientations: Story = {
  render: () => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "8px";

    for (const orientation of ["xz", "xy", "yz"] as const) {
      replaceState(
        { cols: 16, rows: 16, tileSize: 32, orientation },
        [
          {
            id: "path-1",
            cells: [{ col: 2, row: 2 }],
            color: "#4477bb",
            height: 2,
            depth: 0,
          },
        ],
      );
      markDirty();
      const canvas = createCanvas(400, 400);
      canvas.dataset.orientation = orientation;
      const ctx = canvas.getContext("2d")!;
      renderScene(ctx, 400, 400);
      container.appendChild(canvas);
    }

    return container;
  },
  play: async ({ canvasElement }) => {
    for (const orientation of ["xz", "xy", "yz"]) {
      const canvas = canvasElement.querySelector(
        `canvas[data-orientation="${orientation}"]`,
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      await expect(hasVisiblePixels(ctx, 400, 400)).toBe(true);
    }
  },
};

export const CachedSceneStillRenders: Story = {
  render: () => {
    resetState();
    addCell(5, 5);
    markDirty();

    // First render builds the scene
    const canvas1 = createCanvas(400, 400);
    renderScene(canvas1.getContext("2d")!, 400, 400);

    // Second render without markDirty — uses cached scene
    const canvas2 = createCanvas(400, 400);
    renderScene(canvas2.getContext("2d")!, 400, 400);

    return canvas2;
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    await expect(hasVisiblePixels(ctx, 400, 400)).toBe(true);
  },
};

export const CameraRotationDelta: Story = {
  render: () => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "8px";

    // Render at delta 0
    resetState();
    addCell(4, 4);
    addCell(5, 5);
    addCell(6, 4);
    setCameraAngleDelta(0);
    markDirty();
    const canvas0 = createCanvas(400, 400);
    canvas0.dataset.delta = "0";
    renderScene(canvas0.getContext("2d")!, 400, 400);
    container.appendChild(canvas0);

    // Render at delta 20
    setCameraAngleDelta(20);
    markDirty();
    const canvas20 = createCanvas(400, 400);
    canvas20.dataset.delta = "20";
    renderScene(canvas20.getContext("2d")!, 400, 400);
    container.appendChild(canvas20);

    return container;
  },
  play: async ({ canvasElement }) => {
    const canvas0 = canvasElement.querySelector(
      'canvas[data-delta="0"]',
    ) as HTMLCanvasElement;
    const canvas20 = canvasElement.querySelector(
      'canvas[data-delta="20"]',
    ) as HTMLCanvasElement;

    const ctx0 = canvas0.getContext("2d")!;
    const ctx20 = canvas20.getContext("2d")!;

    // Both should have visible content
    await expect(hasVisiblePixels(ctx0, 400, 400)).toBe(true);
    await expect(hasVisiblePixels(ctx20, 400, 400)).toBe(true);

    // The pixel data should differ between the two renders
    const data0 = ctx0.getImageData(0, 0, 400, 400).data;
    const data20 = ctx20.getImageData(0, 0, 400, 400).data;

    let diffCount = 0;
    for (let i = 0; i < data0.length; i += 4) {
      if (
        data0[i] !== data20[i] ||
        data0[i + 1] !== data20[i + 1] ||
        data0[i + 2] !== data20[i + 2] ||
        data0[i + 3] !== data20[i + 3]
      ) {
        diffCount++;
      }
    }
    await expect(diffCount).toBeGreaterThan(0);
  },
};

export const PlaneAtEachOrientation: Story = {
  render: () => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "8px";

    for (const orientation of ["xz", "xy", "yz"] as const) {
      replaceState(
        { cols: 16, rows: 16, tileSize: 32, orientation },
        [{ id: "path-1", cells: [], color: "#4477bb", height: 2, depth: 0 }],
      );
      setActivePlaneDepth(5);
      markDirty();
      const canvas = createCanvas(400, 400);
      canvas.dataset.orientation = orientation;
      const ctx = canvas.getContext("2d")!;
      renderScene(ctx, 400, 400);
      container.appendChild(canvas);
    }

    return container;
  },
  play: async ({ canvasElement }) => {
    // Each orientation should render visible content (the plane geometry)
    for (const orientation of ["xz", "xy", "yz"]) {
      const canvas = canvasElement.querySelector(
        `canvas[data-orientation="${orientation}"]`,
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      await expect(hasVisiblePixels(ctx, 400, 400)).toBe(true);
    }
  },
};

export const StrokeToggle: Story = {
  render: () => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "8px";

    // Render with stroke enabled
    resetState();
    addCell(4, 4);
    addCell(5, 4);
    addCell(4, 5);
    setStroke(true);
    markDirty();
    const canvasOn = createCanvas(400, 400);
    canvasOn.dataset.stroke = "on";
    renderScene(canvasOn.getContext("2d")!, 400, 400);
    container.appendChild(canvasOn);

    // Render with stroke disabled
    setStroke(false);
    markDirty();
    const canvasOff = createCanvas(400, 400);
    canvasOff.dataset.stroke = "off";
    renderScene(canvasOff.getContext("2d")!, 400, 400);
    container.appendChild(canvasOff);

    return container;
  },
  play: async ({ canvasElement }) => {
    const canvasOn = canvasElement.querySelector(
      'canvas[data-stroke="on"]',
    ) as HTMLCanvasElement;
    const canvasOff = canvasElement.querySelector(
      'canvas[data-stroke="off"]',
    ) as HTMLCanvasElement;

    const ctxOn = canvasOn.getContext("2d")!;
    const ctxOff = canvasOff.getContext("2d")!;

    // Both renders should produce visible content
    await expect(hasVisiblePixels(ctxOn, 400, 400)).toBe(true);
    await expect(hasVisiblePixels(ctxOff, 400, 400)).toBe(true);

    // Disabling stroke must change the rendered output
    const dataOn = ctxOn.getImageData(0, 0, 400, 400).data;
    const dataOff = ctxOff.getImageData(0, 0, 400, 400).data;

    let diffCount = 0;
    for (let i = 0; i < dataOn.length; i += 4) {
      if (
        dataOn[i] !== dataOff[i] ||
        dataOn[i + 1] !== dataOff[i + 1] ||
        dataOn[i + 2] !== dataOff[i + 2] ||
        dataOn[i + 3] !== dataOff[i + 3]
      ) {
        diffCount++;
      }
    }
    await expect(diffCount).toBeGreaterThan(0);
  },
};

export const PathsAtMultipleDepths: Story = {
  render: () => {
    resetState();
    replaceState(
      { cols: 16, rows: 16, tileSize: 32, orientation: "xz" },
      [
        {
          id: "path-1",
          cells: [{ col: 4, row: 4 }, { col: 5, row: 4 }, { col: 6, row: 4 }],
          color: "#4477bb",
          height: 2,
          depth: 0,
        },
        {
          id: "path-2",
          cells: [{ col: 4, row: 8 }, { col: 5, row: 8 }, { col: 6, row: 8 }],
          color: "#bb4444",
          height: 2,
          depth: 5,
        },
        {
          id: "path-3",
          cells: [{ col: 4, row: 12 }, { col: 5, row: 12 }, { col: 6, row: 12 }],
          color: "#44bb44",
          height: 2,
          depth: 10,
        },
      ],
    );
    setActivePlaneDepth(5);
    markDirty();

    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext("2d")!;
    renderScene(ctx, 600, 600);
    return canvas;
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    await expect(hasVisiblePixels(ctx, 600, 600)).toBe(true);
  },
};
