import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect } from "storybook/test";
import { initGridEditor } from "../grid-editor.ts";
import {
  getState,
  replaceState,
  hasCell,
  addCell,
  getActivePath,
  createPath,
  setPathColor,
} from "../state.ts";
import { resetState } from "./helpers.ts";

function renderEditor(): HTMLDivElement {
  resetState();
  const container = document.createElement("div");
  initGridEditor(container);
  return container;
}

const meta: Meta = {
  title: "GridEditor",
};

export default meta;

type Story = StoryObj;

// ─── initGridEditor ──────────────────────────────────────────────────────────

export const CreatesCanvas: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas");
    await expect(canvas).toBeTruthy();
  },
};

export const CrosshairCursor: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    await expect(canvas.style.cursor).toBe("crosshair");
  },
};

export const CorrectDimensions: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    // CELL_SIZE=16, GRID_PAD=1, LABEL_PAD=14
    // width = 16 * 16 + 1 + 14 = 271
    await expect(canvas.style.width).toBe("271px");
    await expect(canvas.style.height).toBe("271px");
  },
};

export const ResizesOnGridChange: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    replaceState(
      { cols: 8, rows: 8, tileSize: 32 },
      [{ id: "path-200", cells: [], color: "#4477bb", height: 2, depth: 0 }],
    );
    // width = 8 * 16 + 1 + 14 = 143
    await expect(canvas.style.width).toBe("143px");
    await expect(canvas.style.height).toBe("143px");
  },
};

// ─── Mouse interactions ──────────────────────────────────────────────────────

export const LeftClickAddsCell: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    // Target cell (2, 3): LABEL_PAD + col * CELL_SIZE + half cell
    const clientX = rect.left + 14 + 2 * 16 + 8;
    const clientY = rect.top + 14 + 3 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 0,
        bubbles: true,
      }),
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await expect(hasCell(2, 3)).toBe(true);
  },
};

export const RightClickRemovesCell: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    addCell(4, 5);
    await expect(hasCell(4, 5)).toBe(true);

    const canvas = canvasElement.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + 14 + 4 * 16 + 8;
    const clientY = rect.top + 14 + 5 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 2,
        bubbles: true,
      }),
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await expect(hasCell(4, 5)).toBe(false);
  },
};

export const ClickExistingCellSwitchesPath: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    // Add cell to first path
    addCell(3, 3);
    const firstPathId = getActivePath()!.id;

    // Create second path with a fixed color (avoid random color in visual tests)
    const secondPath = createPath();
    setPathColor(secondPath.id, "#cc3366");
    addCell(5, 5);

    // Click on the first path's cell — should switch back
    const canvas = canvasElement.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + 14 + 3 * 16 + 8;
    const clientY = rect.top + 14 + 3 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 0,
        bubbles: true,
      }),
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await expect(getState().activePathId).toBe(firstPathId);
  },
};

export const DragPaintsMultipleCells: Story = {
  render: renderEditor,
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();

    // mousedown at (1,1)
    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: rect.left + 14 + 1 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      }),
    );

    // mousemove to (2,1)
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: rect.left + 14 + 2 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      }),
    );

    // mousemove to (3,1)
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: rect.left + 14 + 3 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      }),
    );

    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    await expect(hasCell(1, 1)).toBe(true);
    await expect(hasCell(2, 1)).toBe(true);
    await expect(hasCell(3, 1)).toBe(true);
  },
};
