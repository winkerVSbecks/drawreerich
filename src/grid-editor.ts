import {
  getState,
  addCell,
  removeCell,
  setActivePath,
  getPathAtCell,
  subscribe,
} from "./state.ts";
import type { Orientation } from "./state.ts";

const CELL_SIZE = 16;
const GRID_PAD = 1;
const LABEL_PAD = 14; // reserved pixels for axis labels on top and left edges

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let painting = false;
let erasing = false;

export function initGridEditor(container: HTMLElement) {
  canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.cursor = "crosshair";
  container.appendChild(canvas);

  ctx = canvas.getContext("2d")!;

  resize();
  draw();

  subscribe(() => {
    resize();
    draw();
  });

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);
}

function resize() {
  const { cols, rows } = getState().grid;
  const w = cols * CELL_SIZE + GRID_PAD + LABEL_PAD;
  const h = rows * CELL_SIZE + GRID_PAD + LABEL_PAD;
  const dpr = window.devicePixelRatio;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Convert a pointer position to a grid cell, accounting for the label padding. */
function cellAtXY(clientX: number, clientY: number): { col: number; row: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left - LABEL_PAD;
  const y = clientY - rect.top - LABEL_PAD;
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  const { cols, rows } = getState().grid;
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col, row };
}

// --- Mouse handlers ---

function onMouseDown(e: MouseEvent) {
  const cell = cellAtXY(e.clientX, e.clientY);
  if (!cell) return;

  if (e.button === 2) {
    erasing = true;
    removeCell(cell.col, cell.row);
  } else if (e.button === 0) {
    const ownerPath = getPathAtCell(cell.col, cell.row);
    if (ownerPath) {
      setActivePath(ownerPath.id);
    } else {
      painting = true;
      addCell(cell.col, cell.row);
    }
  }
}

function onMouseMove(e: MouseEvent) {
  if (!painting && !erasing) return;
  const cell = cellAtXY(e.clientX, e.clientY);
  if (!cell) return;

  if (painting) addCell(cell.col, cell.row);
  if (erasing) removeCell(cell.col, cell.row);
}

function onMouseUp() {
  painting = false;
  erasing = false;
}

// --- Touch handlers ---

function onTouchStart(e: TouchEvent) {
  e.preventDefault();
  const touch = e.touches[0];
  const cell = cellAtXY(touch.clientX, touch.clientY);
  if (!cell) return;

  const ownerPath = getPathAtCell(cell.col, cell.row);
  if (ownerPath) {
    setActivePath(ownerPath.id);
  } else {
    painting = true;
    addCell(cell.col, cell.row);
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  if (!painting) return;
  const touch = e.touches[0];
  const cell = cellAtXY(touch.clientX, touch.clientY);
  if (!cell) return;

  addCell(cell.col, cell.row);
}

function onTouchEnd() {
  painting = false;
}

/** Return the horizontal and vertical axis names for the current orientation. */
function axisLabels(orientation: Orientation): { h: string; v: string } {
  switch (orientation) {
    case "xz":
      return { h: "X", v: "Z" };
    case "xy":
      return { h: "X", v: "Y" };
    case "yz":
      return { h: "Y", v: "Z" };
  }
}

function draw() {
  const { grid, paths, activePathId } = getState();
  const { cols, rows, orientation } = grid;
  const w = cols * CELL_SIZE + GRID_PAD + LABEL_PAD;
  const h = rows * CELL_SIZE + GRID_PAD + LABEL_PAD;

  ctx.clearRect(0, 0, w, h);

  // Draw background
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  // --- Axis labels ---
  const labels = axisLabels(orientation);
  ctx.fillStyle = "#556";
  ctx.font = "9px monospace";

  // Horizontal axis label centred above the grid
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${labels.h} →`,
    LABEL_PAD + (cols * CELL_SIZE) / 2,
    LABEL_PAD / 2
  );

  // Vertical axis label centred to the left of the grid (rotated)
  ctx.save();
  ctx.translate(LABEL_PAD / 2, LABEL_PAD + (rows * CELL_SIZE) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${labels.v} →`, 0, 0);
  ctx.restore();

  // --- Grid lines (offset by LABEL_PAD) ---
  ctx.strokeStyle = "#2a2a4a";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c++) {
    const x = LABEL_PAD + c * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, LABEL_PAD);
    ctx.lineTo(x, LABEL_PAD + rows * CELL_SIZE);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = LABEL_PAD + r * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(LABEL_PAD, y);
    ctx.lineTo(LABEL_PAD + cols * CELL_SIZE, y);
    ctx.stroke();
  }

  // --- Path cells (offset by LABEL_PAD) ---
  for (const path of paths) {
    const isActive = path.id === activePathId;

    for (const cell of path.cells) {
      const cx = LABEL_PAD + cell.col * CELL_SIZE + 1;
      const cy = LABEL_PAD + cell.row * CELL_SIZE + 1;
      const cw = CELL_SIZE - 1;
      const ch = CELL_SIZE - 1;

      ctx.globalAlpha = isActive ? 1.0 : 0.5;
      ctx.fillStyle = path.color;
      ctx.fillRect(cx, cy, cw, ch);

      if (isActive) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
      }
    }
  }

  ctx.globalAlpha = 1.0;
}
