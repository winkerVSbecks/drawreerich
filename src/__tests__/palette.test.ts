import { describe, it, expect } from 'vitest';
import { generatePalette, generateColors } from '../palette.ts';

describe('generatePalette', () => {
  it('returns exactly 1 background colour and 5 path colours', () => {
    const palette = generatePalette();
    expect(palette.background).toBeDefined();
    expect(typeof palette.background).toBe('string');
    expect(palette.pathColors).toHaveLength(5);
  });

  it('returns colours in hex format', () => {
    const palette = generatePalette();
    expect(palette.background).toMatch(/^#[0-9a-f]{6}$/);
    for (const color of palette.pathColors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('generates different palettes on successive calls', () => {
    const palette1 = generatePalette();
    const palette2 = generatePalette();
    // With random hStart, it's extremely unlikely both are identical
    const allSame =
      palette1.background === palette2.background &&
      palette1.pathColors.every((c, i) => c === palette2.pathColors[i]);
    expect(allSame).toBe(false);
  });

  it('all colours are non-empty strings', () => {
    const palette = generatePalette();
    expect(palette.background.length).toBeGreaterThan(0);
    for (const color of palette.pathColors) {
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

describe('generateColors', () => {
  it('returns 6 colours by default', () => {
    const colors = generateColors('hex', 180);
    expect(colors).toHaveLength(6);
  });

  it('returns hex colours when format is hex', () => {
    const colors = generateColors('hex', 90);
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('returns srgb CSS colours when format is srgb', () => {
    const colors = generateColors('srgb', 270);
    for (const c of colors) {
      expect(c).toMatch(/^color\(srgb/);
    }
  });
});
