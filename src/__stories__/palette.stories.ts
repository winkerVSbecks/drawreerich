import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { expect } from 'storybook/test';
import { renderScene, markDirty } from '../renderer.ts';
import { replaceState, setPathColor, setPathColorSource } from '../state.ts';
import { generatePalette } from '../palette.ts';
import { hasVisiblePixels } from './helpers.ts';

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return canvas;
}

const meta: Meta = {
  title: 'Palette',
};

export default meta;

type Story = StoryObj;

export const PaletteAppliedScene: Story = {
  render: () => {
    const palette = generatePalette('palette-applied-scene');
    setPathColorSource(palette.pathColors);

    // Set up a scene with paths coloured by palette
    replaceState({ cols: 16, rows: 16, tileSize: 32 }, [
      {
        id: 'path-1',
        cells: [
          { col: 3, row: 3 },
          { col: 4, row: 3 },
          { col: 5, row: 3 },
        ],
        color: palette.pathColors[0],
        height: 2,
        depth: 0,
      },
      {
        id: 'path-2',
        cells: [
          { col: 3, row: 7 },
          { col: 4, row: 7 },
          { col: 5, row: 7 },
        ],
        color: palette.pathColors[1],
        height: 3,
        depth: 0,
      },
      {
        id: 'path-3',
        cells: [
          { col: 3, row: 11 },
          { col: 4, row: 11 },
          { col: 5, row: 11 },
        ],
        color: palette.pathColors[2],
        height: 4,
        depth: 0,
      },
    ]);
    markDirty();

    // Apply background to the document for the renderer to pick up
    document.documentElement.style.setProperty('--bg', palette.background);

    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d')!;
    renderScene(ctx, 600, 600);
    return canvas;
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement.querySelector('canvas')!;
    const ctx = canvas.getContext('2d')!;

    // The scene should have visible coloured pixels
    await expect(hasVisiblePixels(ctx, 600, 600)).toBe(true);

    // Verify there are non-background pixels (multiple distinct colors)
    const data = ctx.getImageData(0, 0, 600, 600).data;
    const colorSet = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        colorSet.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
    }
    // Should have more than just one colour (background + at least one path colour)
    await expect(colorSet.size).toBeGreaterThan(1);
  },
};

export const RegeneratePaletteRecolours: Story = {
  render: () => {
    // First palette
    const palette1 = generatePalette('regenerate-before');
    setPathColorSource(palette1.pathColors);

    replaceState({ cols: 16, rows: 16, tileSize: 32 }, [
      {
        id: 'path-1',
        cells: [
          { col: 4, row: 4 },
          { col: 5, row: 4 },
          { col: 6, row: 4 },
        ],
        color: palette1.pathColors[0],
        height: 2,
        depth: 0,
      },
    ]);
    document.documentElement.style.setProperty('--bg', palette1.background);
    markDirty();

    const canvas1 = createCanvas(400, 400);
    canvas1.dataset.version = 'before';
    renderScene(canvas1.getContext('2d')!, 400, 400);

    // Second palette (regenerate) — recolour the path
    const palette2 = generatePalette('regenerate-after');
    setPathColorSource(palette2.pathColors);
    setPathColor('path-1', palette2.pathColors[0]);
    document.documentElement.style.setProperty('--bg', palette2.background);
    markDirty();

    const canvas2 = createCanvas(400, 400);
    canvas2.dataset.version = 'after';
    renderScene(canvas2.getContext('2d')!, 400, 400);

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.appendChild(canvas1);
    container.appendChild(canvas2);
    return container;
  },
  play: async ({ canvasElement }) => {
    const before = canvasElement.querySelector(
      'canvas[data-version="before"]',
    ) as HTMLCanvasElement;
    const after = canvasElement.querySelector(
      'canvas[data-version="after"]',
    ) as HTMLCanvasElement;

    const ctx1 = before.getContext('2d')!;
    const ctx2 = after.getContext('2d')!;

    // Both should be visible
    await expect(hasVisiblePixels(ctx1, 400, 400)).toBe(true);
    await expect(hasVisiblePixels(ctx2, 400, 400)).toBe(true);

    // The two renders should differ (different palettes)
    const data1 = ctx1.getImageData(0, 0, 400, 400).data;
    const data2 = ctx2.getImageData(0, 0, 400, 400).data;
    let diffCount = 0;
    for (let i = 0; i < data1.length; i += 4) {
      if (
        data1[i] !== data2[i] ||
        data1[i + 1] !== data2[i + 1] ||
        data1[i + 2] !== data2[i + 2]
      ) {
        diffCount++;
      }
    }
    await expect(diffCount).toBeGreaterThan(0);
  },
};
