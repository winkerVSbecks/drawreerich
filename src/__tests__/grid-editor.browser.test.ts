import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getState,
  replaceState,
  hasCell,
  addCell,
  setStroke,
  setCameraType,
  getActivePath,
  createPath,
  setActivePath,
} from "../state.ts";
import type { GridConfig, Path } from "../state.ts";
import { initGridEditor } from "../grid-editor.ts";

let container: HTMLDivElement;

function resetState() {
  const grid: GridConfig = {
    cols: 16,
    rows: 16,
    tileSize: 32,
    orientation: "xz",
  };
  const paths: Path[] = [
    { id: "path-100", cells: [], color: "#4477bb", height: 2 },
  ];
  replaceState(grid, paths);
  setStroke(true);
  setCameraType("isometric");
}

beforeEach(() => {
  resetState();
  container = document.createElement("div");
  document.body.appendChild(container);
  initGridEditor(container);
});

afterEach(() => {
  container.remove();
});

describe("initGridEditor", () => {
  it("creates a canvas element in the container", () => {
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
  });

  it("sets the canvas cursor to crosshair", () => {
    const canvas = container.querySelector("canvas")!;
    expect(canvas.style.cursor).toBe("crosshair");
  });

  it("canvas has correct dimensions based on grid config", () => {
    const canvas = container.querySelector("canvas")!;
    // CELL_SIZE=16, GRID_PAD=1, LABEL_PAD=14
    // width = 16 * 16 + 1 + 14 = 271
    // height = 16 * 16 + 1 + 14 = 271
    expect(canvas.style.width).toBe("271px");
    expect(canvas.style.height).toBe("271px");
  });

  it("canvas resizes when grid dimensions change", () => {
    const canvas = container.querySelector("canvas")!;
    replaceState(
      { cols: 8, rows: 8, tileSize: 32, orientation: "xz" },
      [{ id: "path-200", cells: [], color: "#4477bb", height: 2 }]
    );
    // width = 8 * 16 + 1 + 14 = 143
    expect(canvas.style.width).toBe("143px");
    expect(canvas.style.height).toBe("143px");
  });
});

describe("mouse interactions", () => {
  it("left-click on grid cell adds a cell to active path", () => {
    const canvas = container.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    // Target cell (2, 3): LABEL_PAD + col * CELL_SIZE + half cell
    // LABEL_PAD=14, CELL_SIZE=16
    const clientX = rect.left + 14 + 2 * 16 + 8;
    const clientY = rect.top + 14 + 3 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 0,
        bubbles: true,
      })
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(hasCell(2, 3)).toBe(true);
  });

  it("right-click on grid cell removes a cell", () => {
    addCell(4, 5);
    expect(hasCell(4, 5)).toBe(true);

    const canvas = container.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + 14 + 4 * 16 + 8;
    const clientY = rect.top + 14 + 5 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 2,
        bubbles: true,
      })
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(hasCell(4, 5)).toBe(false);
  });

  it("clicking an existing cell of another path switches active path", () => {
    // Add cell to first path
    addCell(3, 3);
    const firstPathId = getActivePath()!.id;

    // Create second path and add a cell
    const secondPath = createPath();
    addCell(5, 5);

    // Now click on the first path's cell — should switch back
    const canvas = container.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + 14 + 3 * 16 + 8;
    const clientY = rect.top + 14 + 3 * 16 + 8;

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX,
        clientY,
        button: 0,
        bubbles: true,
      })
    );
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(getState().activePathId).toBe(firstPathId);
  });

  it("dragging paints multiple cells", () => {
    const canvas = container.querySelector("canvas")!;
    const rect = canvas.getBoundingClientRect();

    // mousedown at (1,1)
    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        clientX: rect.left + 14 + 1 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      })
    );

    // mousemove to (2,1)
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: rect.left + 14 + 2 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      })
    );

    // mousemove to (3,1)
    canvas.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: rect.left + 14 + 3 * 16 + 8,
        clientY: rect.top + 14 + 1 * 16 + 8,
        button: 0,
        bubbles: true,
      })
    );

    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(hasCell(1, 1)).toBe(true);
    expect(hasCell(2, 1)).toBe(true);
    expect(hasCell(3, 1)).toBe(true);
  });
});
