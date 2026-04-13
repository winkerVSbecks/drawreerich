import { describe, it, expect } from "vitest";
import { generatePalette } from "../palette.ts";

describe("generatePalette", () => {
  it("returns exactly 1 background colour and 9 path colours", () => {
    const palette = generatePalette();
    expect(palette.background).toBeDefined();
    expect(typeof palette.background).toBe("string");
    expect(palette.pathColors).toHaveLength(9);
  });

  it("returns colours in oklch format", () => {
    const palette = generatePalette();
    expect(palette.background).toMatch(/^oklch\(/);
    for (const color of palette.pathColors) {
      expect(color).toMatch(/^oklch\(/);
    }
  });

  it("generates different palettes on successive calls (random hStart)", () => {
    const palette1 = generatePalette();
    const palette2 = generatePalette();
    // With random hStart, it's extremely unlikely both are identical
    const allSame =
      palette1.background === palette2.background &&
      palette1.pathColors.every((c, i) => c === palette2.pathColors[i]);
    expect(allSame).toBe(false);
  });

  it("all colours are non-empty strings", () => {
    const palette = generatePalette();
    expect(palette.background.length).toBeGreaterThan(0);
    for (const color of palette.pathColors) {
      expect(color.length).toBeGreaterThan(0);
    }
  });
});
