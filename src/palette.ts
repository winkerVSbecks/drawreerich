import { generateColorRamp, colorUtils } from "rampensau";

const { colorToCSS } = colorUtils;

export interface Palette {
  background: string;
  pathColors: string[];
}

/**
 * Generate a 10-colour palette using rampensau.
 * Index 0 = background (dark), indices 1–9 = path colours.
 * All colours are returned as oklch CSS strings.
 */
export function generatePalette(): Palette {
  const hStart = Math.random() * 360;

  const colors = generateColorRamp({
    total: 10,
    hStart,
    hCycles: 1,
    sRange: [0.4, 0.8],
    lRange: [0.15, 0.75],
  });

  const cssColors = colors.map((c) => colorToCSS(c, "oklch"));

  return {
    background: cssColors[0],
    pathColors: cssColors.slice(1),
  };
}
