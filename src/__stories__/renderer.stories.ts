import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect } from "storybook/test";
import { renderScene, markDirty } from "../renderer.ts";
import { replaceState, addCell } from "../state.ts";
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
    let hasNonClear = false;
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i] !== 0 ||
        data[i + 1] !== 0 ||
        data[i + 2] !== 0 ||
        data[i + 3] !== 0
      ) {
        hasNonClear = true;
        break;
      }
    }
    await expect(hasNonClear).toBe(false);
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
