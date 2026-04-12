import { getState, replaceState, subscribe } from "./state.ts";
import type { GridConfig, Path } from "./state.ts";

const STORAGE_KEY = "drawreerich-state";

interface SaveData {
  version: 1;
  grid: GridConfig;
  paths: Path[];
}

function serialize(): string {
  const { grid, paths } = getState();
  const data: SaveData = { version: 1, grid, paths };
  return JSON.stringify(data);
}

function isValidSaveData(data: unknown): data is SaveData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.grid !== "object" || d.grid === null) return false;
  if (!Array.isArray(d.paths)) return false;

  const grid = d.grid as Record<string, unknown>;
  if (typeof grid.cols !== "number") return false;
  if (typeof grid.rows !== "number") return false;
  if (typeof grid.tileSize !== "number") return false;
  if (!["xz", "xy", "yz"].includes(grid.orientation as string)) return false;

  for (const p of d.paths as unknown[]) {
    if (typeof p !== "object" || p === null) return false;
    const path = p as Record<string, unknown>;
    if (typeof path.id !== "string") return false;
    if (typeof path.color !== "string") return false;
    if (typeof path.height !== "number") return false;
    if (!Array.isArray(path.cells)) return false;
  }

  return true;
}

/**
 * Attempt to restore state from localStorage.
 * Call this before reading state for UI initialization.
 */
export function tryRestore(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!isValidSaveData(data)) return false;
    replaceState(data.grid, data.paths);
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to state changes and auto-save to localStorage.
 */
export function startAutoSave() {
  subscribe(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize());
    } catch {
      // localStorage may be full or unavailable — silently ignore
    }
  });
}

/**
 * Download the current state as a JSON file.
 */
export function exportJSON() {
  const json = serialize();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "drawreerich.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker and import a JSON file into state.
 * Returns a promise that resolves when import is complete, or rejects with an error message.
 */
export function importJSON(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (!isValidSaveData(data)) {
            reject(new Error("Invalid or malformed JSON file."));
            return;
          }
          replaceState(data.grid, data.paths);
          resolve();
        } catch {
          reject(new Error("Failed to parse JSON file."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file."));
      };
      reader.readAsText(file);
    });

    input.click();
  });
}
