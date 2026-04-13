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
const LABEL_PAD = 14; // reserved pixels for axis labels on top and left edges

/** Return the horizontal and vertical axis names (always XZ plane). */
export function axisLabels(): { h: string; v: string } {
  return { h: "X", v: "Z" };
}

export class GridEditor {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private painting = false;
  private erasing = false;
  private unsubscribe: () => void;
  private boundMouseUp: () => void;

  constructor(doc: Document) {
    this.canvas = doc.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.cursor = "crosshair";

    this.ctx = this.canvas.getContext("2d")!;

    this.resize();
    this.draw();

    this.unsubscribe = subscribe(() => {
      this.resize();
      this.draw();
    });

    this.boundMouseUp = () => this.onMouseUp();

    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchend", () => this.onTouchEnd());
  }

  dispose(): void {
    this.unsubscribe();
    window.removeEventListener("mouseup", this.boundMouseUp);
  }

  private resize(): void {
    const { cols, rows } = getState().grid;
    const w = cols * CELL_SIZE + GRID_PAD + LABEL_PAD;
    const h = rows * CELL_SIZE + GRID_PAD + LABEL_PAD;
    const dpr = window.devicePixelRatio;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private cellAtXY(
    clientX: number,
    clientY: number
  ): { col: number; row: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - LABEL_PAD;
    const y = clientY - rect.top - LABEL_PAD;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    const { cols, rows } = getState().grid;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { col, row };
  }

  private onMouseDown(e: MouseEvent): void {
    const cell = this.cellAtXY(e.clientX, e.clientY);
    if (!cell) return;

    if (e.button === 2) {
      this.erasing = true;
      removeCell(cell.col, cell.row);
    } else if (e.button === 0) {
      const ownerPath = getPathAtCell(cell.col, cell.row);
      if (ownerPath) {
        setActivePath(ownerPath.id);
      } else {
        this.painting = true;
        addCell(cell.col, cell.row);
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.painting && !this.erasing) return;
    const cell = this.cellAtXY(e.clientX, e.clientY);
    if (!cell) return;

    if (this.painting) addCell(cell.col, cell.row);
    if (this.erasing) removeCell(cell.col, cell.row);
  }

  private onMouseUp(): void {
    this.painting = false;
    this.erasing = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = this.cellAtXY(touch.clientX, touch.clientY);
    if (!cell) return;

    const ownerPath = getPathAtCell(cell.col, cell.row);
    if (ownerPath) {
      setActivePath(ownerPath.id);
    } else {
      this.painting = true;
      addCell(cell.col, cell.row);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.painting) return;
    const touch = e.touches[0];
    const cell = this.cellAtXY(touch.clientX, touch.clientY);
    if (!cell) return;

    addCell(cell.col, cell.row);
  }

  private onTouchEnd(): void {
    this.painting = false;
  }

  private draw(): void {
    const { grid, paths, activePathId } = getState();
    const { cols, rows } = grid;
    const w = cols * CELL_SIZE + GRID_PAD + LABEL_PAD;
    const h = rows * CELL_SIZE + GRID_PAD + LABEL_PAD;

    this.ctx.clearRect(0, 0, w, h);

    // Draw background
    this.ctx.fillStyle = "#0d1117";
    this.ctx.fillRect(0, 0, w, h);

    // --- Axis labels ---
    const labels = axisLabels();
    this.ctx.fillStyle = "#556";
    this.ctx.font = "9px monospace";

    // Horizontal axis label centred above the grid
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      `${labels.h} →`,
      LABEL_PAD + (cols * CELL_SIZE) / 2,
      LABEL_PAD / 2
    );

    // Vertical axis label centred to the left of the grid (rotated)
    this.ctx.save();
    this.ctx.translate(LABEL_PAD / 2, LABEL_PAD + (rows * CELL_SIZE) / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText(`${labels.v} →`, 0, 0);
    this.ctx.restore();

    // --- Grid lines (offset by LABEL_PAD) ---
    this.ctx.strokeStyle = "#2a2a4a";
    this.ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) {
      const x = LABEL_PAD + c * CELL_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, LABEL_PAD);
      this.ctx.lineTo(x, LABEL_PAD + rows * CELL_SIZE);
      this.ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = LABEL_PAD + r * CELL_SIZE + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(LABEL_PAD, y);
      this.ctx.lineTo(LABEL_PAD + cols * CELL_SIZE, y);
      this.ctx.stroke();
    }

    // --- Path cells (offset by LABEL_PAD) ---
    for (const path of paths) {
      const isActive = path.id === activePathId;

      for (const cell of path.cells) {
        const cx = LABEL_PAD + cell.col * CELL_SIZE + 1;
        const cy = LABEL_PAD + cell.row * CELL_SIZE + 1;
        const cw = CELL_SIZE - 1;
        const ch = CELL_SIZE - 1;

        this.ctx.globalAlpha = isActive ? 1.0 : 0.5;
        this.ctx.fillStyle = path.color;
        this.ctx.fillRect(cx, cy, cw, ch);

        if (isActive) {
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
        }
      }
    }

    this.ctx.globalAlpha = 1.0;
  }
}

/** Mount a grid editor canvas in `container`. Used by Storybook stories. */
export function initGridEditor(container: HTMLElement): GridEditor {
  const editor = new GridEditor(document);
  container.appendChild(editor.canvas);
  return editor;
}
