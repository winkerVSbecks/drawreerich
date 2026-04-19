import {
  getState,
  replaceState,
  subscribe,
  ROTATION_PRESETS,
} from './state.ts';
import type { GridConfig, Path, Rotation } from './state.ts';

const STORAGE_KEY = 'drawreerich-state';

interface SaveData {
  version: 1 | 2;
  grid: GridConfig & { orientation?: string };
  paths: Path[];
  rotation?: Rotation;
}

function serialize(): string {
  const { grid, paths, rotation } = getState();
  const data: SaveData = { version: 2, grid, paths, rotation };
  return JSON.stringify(data);
}

export function isValidSaveData(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 && d.version !== 2) return false;
  if (typeof d.grid !== 'object' || d.grid === null) return false;
  if (!Array.isArray(d.paths)) return false;

  const grid = d.grid as Record<string, unknown>;
  if (typeof grid.cols !== 'number') return false;
  if (typeof grid.rows !== 'number') return false;
  if (typeof grid.tileSize !== 'number') return false;

  // v1 had orientation in grid; v2 uses top-level rotation
  if (d.version === 1) {
    if (!['xz', 'xy', 'yz'].includes(grid.orientation as string)) return false;
  }

  for (const p of d.paths as unknown[]) {
    if (typeof p !== 'object' || p === null) return false;
    const path = p as Record<string, unknown>;
    if (typeof path.id !== 'string') return false;
    if (typeof path.color !== 'string') return false;
    if (typeof path.height !== 'number') return false;
    if (!Array.isArray(path.cells)) return false;
    // depth is optional for backwards compatibility — defaults to 0 in replaceState
    if (path.depth !== undefined && typeof path.depth !== 'number')
      return false;
  }

  return true;
}

/**
 * Attempt to restore state from localStorage.
 * Call this before reading state for UI initialization.
 */
/** Convert a legacy v1 orientation string to a Rotation. */
function migrateOrientation(orientation: string): Rotation {
  switch (orientation) {
    case 'xy':
      return ROTATION_PRESETS.xy;
    case 'yz':
      return ROTATION_PRESETS.yz;
    default:
      return ROTATION_PRESETS.xz;
  }
}

export function tryRestore(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!isValidSaveData(data)) return false;

    const rotation =
      data.version === 1
        ? migrateOrientation(data.grid.orientation ?? 'xz')
        : data.rotation;

    replaceState(data.grid, data.paths, rotation);
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
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drawreerich.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a file picker and import a JSON file into state.
 * Returns a promise that resolves when import is complete, or rejects with an error message.
 */
export function importJSON(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.addEventListener('change', () => {
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
            reject(new Error('Invalid or malformed JSON file.'));
            return;
          }
          const rotation =
            data.version === 1
              ? migrateOrientation(data.grid.orientation ?? 'xz')
              : data.rotation;
          replaceState(data.grid, data.paths, rotation);
          resolve();
        } catch {
          reject(new Error('Failed to parse JSON file.'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      reader.readAsText(file);
    });

    input.click();
  });
}
