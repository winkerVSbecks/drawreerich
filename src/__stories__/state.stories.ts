import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { expect } from "storybook/test";
import {
  getState,
  getActivePath,
  addCell,
  createPath,
  hasCell,
  clearAllPaths,
} from "../state.ts";
import { resetState } from "./helpers.ts";

const meta: Meta = {
  title: "State",
};

export default meta;

type Story = StoryObj;

// ─── clearAllPaths ──────────────────────────────────────────────────────────

export const ClearAllRemovesPathsAndCells: Story = {
  render: () => {
    resetState();

    // Set up multiple paths with cells
    addCell(0, 0);
    addCell(1, 1);
    createPath();
    addCell(3, 3);

    const div = document.createElement("div");
    div.textContent = "clearAllPaths — removes all paths and cells";
    return div;
  },
  play: async () => {
    // Verify setup: multiple paths exist with cells
    await expect(getState().paths.length).toBe(2);
    await expect(hasCell(0, 0)).toBe(true);
    await expect(hasCell(3, 3)).toBe(true);

    // Execute clear all
    clearAllPaths();

    // After clearing: exactly one empty path
    const s = getState();
    await expect(s.paths).toHaveLength(1);
    await expect(s.paths[0].cells).toEqual([]);
    await expect(s.activePathId).toBe(s.paths[0].id);

    // All cells gone
    await expect(hasCell(0, 0)).toBe(false);
    await expect(hasCell(1, 1)).toBe(false);
    await expect(hasCell(3, 3)).toBe(false);

    // New path has valid properties
    const path = s.paths[0];
    await expect(path.id).toMatch(/^path-\d+$/);
    await expect(path.color).toMatch(/^#[0-9a-f]{6}$/);
    await expect(path.height).toBe(2);
  },
};
