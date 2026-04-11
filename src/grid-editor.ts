import {
  getState,
  addCell,
  removeCell,
  setActivePath,
  getPathAtCell,
  subscribe,
} from "./state.ts";

const CELL_SIZE = 16;
const GRID_PAD = 1;

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

  subscribe(() => draw());

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

function resize() {
  const { cols, rows } = getState().grid;
  const w = cols * CELL_SIZE + GRID_PAD;
  const h = rows * CELL_SIZE + GRID_PAD;
  const dpr = window.devicePixelRatio;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cellAt(e: MouseEvent): { col: number; row: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  const { cols, rows } = getState().grid;
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col, row };
}

function onMouseDown(e: MouseEvent) {
  const cell = cellAt(e);
  if (!cell) return;

  if (e.button === 2) {
    // Right-click: erase from active path
    erasing = true;
    removeCell(cell.col, cell.row);
  } else if (e.button === 0) {
    // Left-click: check if clicking an existing cell owned by another path
    const ownerPath = getPathAtCell(cell.col, cell.row);
    if (ownerPath) {
      // Switch to the path that owns this cell
      setActivePath(ownerPath.id);
    } else {
      // Paint on empty cell
      painting = true;
      addCell(cell.col, cell.row);
    }
  }
}

function onMouseMove(e: MouseEvent) {
  if (!painting && !erasing) return;
  const cell = cellAt(e);
  if (!cell) return;

  if (painting) addCell(cell.col, cell.row);
  if (erasing) removeCell(cell.col, cell.row);
}

function onMouseUp() {
  painting = false;
  erasing = false;
}

function draw() {
  const { grid, paths, activePathId } = getState();
  const { cols, rows } = grid;
  const w = cols * CELL_SIZE + GRID_PAD;
  const h = rows * CELL_SIZE + GRID_PAD;

  ctx.clearRect(0, 0, w, h);

  // Draw grid background
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  // Draw grid lines
  ctx.strokeStyle = "#2a2a4a";
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c++) {
    const x = c * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * CELL_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw all paths' cells
  for (const path of paths) {
    const isActive = path.id === activePathId;

    for (const cell of path.cells) {
      const cx = cell.col * CELL_SIZE + 1;
      const cy = cell.row * CELL_SIZE + 1;
      const cw = CELL_SIZE - 1;
      const ch = CELL_SIZE - 1;

      // Inactive paths are dimmed to 50% opacity
      ctx.globalAlpha = isActive ? 1.0 : 0.5;
      ctx.fillStyle = path.color;
      ctx.fillRect(cx, cy, cw, ch);

      // Active path cells get a bright outline
      if (isActive) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
      }
    }
  }

  // Reset alpha
  ctx.globalAlpha = 1.0;
}
