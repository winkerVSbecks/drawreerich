import {
  trilerp,
  converter,
  formatCss,
  formatHex,
  easingSmoothstep,
} from 'culori';
import { generateColorRamp } from 'rampensau';
import Random from 'canvas-sketch-util/random';

export interface Palette {
  background: string;
  pathColors: string[];
}

const newOptions = (hue: number) => ({
  total: 6,
  hStart: hue,
  hStartCenter: 0,
  hCycles: Random.range(-0.125, 0.125),
  sRange: Random.chance(0.7)
    ? [Random.range(0.2, 1.2), Random.range(0.25, 1.3)]
    : [1, Random.value()],
  sEasing: (x: number) => Math.pow(x, 2),
  lRange: [
    Random.chance() ? Random.range(0.55, 1.3) : Random.range(0.88, 1.12),
    Random.range(0, 0.4),
  ],
  lEasing: (x: number) => Math.pow(x, 1.1),
});

const rgb = converter('rgb');

const RYB_CUBE = [
  { mode: 'rgb' as const, r: 248 / 255, g: 237 / 255, b: 220 / 255 }, // white
  { mode: 'rgb' as const, r: 0.8901960784313725, g: 0.1411764705882353, b: 0.12941176470588237 }, // red
  { mode: 'rgb' as const, r: 0.9529411764705882, g: 0.9019607843137255, b: 0 }, // yellow
  { mode: 'rgb' as const, r: 0.9411764705882353, g: 0.5568627450980392, b: 0.10980392156862745 }, // orange
  { mode: 'rgb' as const, r: 0.08627450980392157, g: 0.6, b: 0.8549019607843137 }, // blue
  { mode: 'rgb' as const, r: 0.47058823529411764, g: 0.13333333333333333, b: 0.6666666666666666 }, // violet
  { mode: 'rgb' as const, r: 0, g: 0.5568627450980392, b: 0.3568627450980392 }, // green
  { mode: 'rgb' as const, r: 29 / 255, g: 28 / 255, b: 28 / 255 }, // black
];

function ryb2rgb(coords: number[]) {
  const r = easingSmoothstep(coords[0]);
  const y = easingSmoothstep(coords[1]);
  const b = easingSmoothstep(coords[2]);
  return {
    mode: 'rgb' as const,
    r: trilerp(...RYB_CUBE.map((it) => it.r) as [number, number, number, number, number, number, number, number], r, y, b),
    g: trilerp(...RYB_CUBE.map((it) => it.g) as [number, number, number, number, number, number, number, number], r, y, b),
    b: trilerp(...RYB_CUBE.map((it) => it.b) as [number, number, number, number, number, number, number, number], r, y, b),
  };
}

function hsl2farbrad(h: number, s: number, l: number) {
  const rgbColor = rgb({
    mode: 'hsl',
    h: (h + 360) % 360,
    s,
    l: 1 - l,
  });
  return ryb2rgb([rgbColor.r, rgbColor.g, rgbColor.b]);
}

export function generateColors(
  format: 'srgb' | 'hex' = 'srgb',
  hue: number
): string[] {
  const options = newOptions(hue);

  const colorHSL = generateColorRamp(options as Parameters<typeof generateColorRamp>[0]);

  const colors =
    format === 'srgb'
      ? colorHSL.map((hsl) => formatCss(hsl2farbrad(...hsl)))
      : colorHSL.map((hsl) => formatHex(hsl2farbrad(...hsl)));

  return colors as string[];
}

/**
 * Generate a colour palette using rampensau + RYB colour mixing.
 * Index 0 = background (darkest), rest = path colours.
 */
export function generatePalette(): Palette {
  const hue = Random.range(0, 360);
  const colors = generateColors('hex', hue);

  return {
    background: colors[0],
    pathColors: colors.slice(1),
  };
}
