import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect } from 'storybook/test';
import { getState, replaceState, addCell } from '../state.ts';
import { tryRestore, startAutoSave, isValidSaveData } from '../storage.ts';
import { resetState } from './helpers.ts';

const STORAGE_KEY = 'drawreerich-state';

const meta: Meta = {
  title: 'Storage',
};

export default meta;

type Story = StoryObj;

// ─── tryRestore ──────────────────────────────────────────────────────────────

export const RestoresValidState: Story = {
  render: () => {
    localStorage.clear();
    resetState();

    const saved = {
      version: 1,
      grid: { cols: 8, rows: 10, tileSize: 24, orientation: 'xy' },
      paths: [
        {
          id: 'path-42',
          cells: [{ col: 1, row: 2 }],
          color: '#ff0000',
          height: 3,
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const div = document.createElement('div');
    div.textContent = 'tryRestore — valid state';
    return div;
  },
  play: async () => {
    const result = tryRestore();
    await expect(result).toBe(true);

    const s = getState();
    await expect(s.grid.cols).toBe(8);
    await expect(s.grid.rows).toBe(10);
    await expect(s.grid.tileSize).toBe(24);
    // v1 orientation "xy" should be migrated to rotation {x:1, y:0, z:0}
    await expect(s.rotation).toEqual({ x: 1, y: 0, z: 0 });
    await expect(s.paths).toHaveLength(1);
    await expect(s.paths[0].id).toBe('path-42');
    await expect(s.paths[0].cells).toEqual([{ col: 1, row: 2 }]);
  },
};

export const ReturnsFalseWhenEmpty: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    const div = document.createElement('div');
    div.textContent = 'tryRestore — empty localStorage';
    return div;
  },
  play: async () => {
    await expect(tryRestore()).toBe(false);
  },
};

export const ReturnsFalseForInvalidJSON: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const div = document.createElement('div');
    div.textContent = 'tryRestore — invalid JSON';
    return div;
  },
  play: async () => {
    await expect(tryRestore()).toBe(false);
  },
};

export const ReturnsFalseForInvalidSaveData: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }));
    const div = document.createElement('div');
    div.textContent = 'tryRestore — invalid save data';
    return div;
  },
  play: async () => {
    await expect(tryRestore()).toBe(false);
  },
};

export const DoesNotModifyStateOnFailure: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    localStorage.setItem(STORAGE_KEY, 'bad data');
    const div = document.createElement('div');
    div.textContent = 'tryRestore — state unchanged on failure';
    return div;
  },
  play: async () => {
    const beforeCols = getState().grid.cols;
    tryRestore();
    await expect(getState().grid.cols).toBe(beforeCols);
  },
};

// ─── startAutoSave ───────────────────────────────────────────────────────────

export const AutoSavesOnStateChange: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    const div = document.createElement('div');
    div.textContent = 'startAutoSave — saves on state change';
    return div;
  },
  play: async () => {
    startAutoSave();
    addCell(2, 3);

    const raw = localStorage.getItem(STORAGE_KEY);
    await expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    await expect(isValidSaveData(parsed)).toBe(true);
    await expect(parsed.paths[0].cells).toContainEqual({ col: 2, row: 3 });
  },
};

export const AutoSavesOnGridConfigChange: Story = {
  render: () => {
    localStorage.clear();
    resetState();
    const div = document.createElement('div');
    div.textContent = 'startAutoSave — saves on grid config change';
    return div;
  },
  play: async () => {
    startAutoSave();

    const { grid } = getState();
    replaceState(
      { ...grid, cols: 12, rows: 12, tileSize: 48 },
      getState().paths,
      { x: 0, y: 0, z: 1 },
    );

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    await expect(parsed.grid.cols).toBe(12);
    await expect(parsed.rotation).toEqual({ x: 0, y: 0, z: 1 });
  },
};
