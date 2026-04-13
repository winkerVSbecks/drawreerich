declare module 'culori' {
  interface RgbColor {
    mode: 'rgb';
    r: number;
    g: number;
    b: number;
  }

  interface HslColor {
    mode: 'hsl';
    h: number;
    s: number;
    l: number;
  }

  export function trilerp(
    a000: number, a010: number, a100: number, a110: number,
    a001: number, a011: number, a101: number, a111: number,
    tx: number, ty: number, tz: number
  ): number;
  export function converter(mode: string): (color: HslColor | RgbColor) => RgbColor;
  export function formatCss(color: RgbColor): string;
  export function formatHex(color: RgbColor): string;
  export function easingSmoothstep(t: number): number;
}

declare module 'canvas-sketch-util/random' {
  const Random: {
    range(min: number, max: number): number;
    chance(probability?: number): boolean;
    value(): number;
    pick<T>(array: T[]): T;
    setSeed(seed: number | string): void;
    getSeed(): number | string;
  };
  export default Random;
}
