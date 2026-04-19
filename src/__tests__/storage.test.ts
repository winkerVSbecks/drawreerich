import { describe, it, expect } from 'vitest';
import { isValidSaveData } from '../storage.ts';

describe('isValidSaveData', () => {
  // Legacy v1 format (with orientation)
  const validV1 = {
    version: 1,
    grid: { cols: 16, rows: 16, tileSize: 32, orientation: 'xz' },
    paths: [
      {
        id: 'path-1',
        cells: [{ col: 0, row: 0 }],
        color: '#4477bb',
        height: 2,
      },
    ],
  };

  // New v2 format (with rotation)
  const validV2 = {
    version: 2,
    grid: { cols: 16, rows: 16, tileSize: 32 },
    paths: [
      {
        id: 'path-1',
        cells: [{ col: 0, row: 0 }],
        color: '#4477bb',
        height: 2,
      },
    ],
    rotation: { x: 0, y: 0, z: 0 },
  };

  it('returns true for valid v1 data', () => {
    expect(isValidSaveData(validV1)).toBe(true);
  });

  it('returns true for valid v2 data', () => {
    expect(isValidSaveData(validV2)).toBe(true);
  });

  it('returns true for valid data with empty paths array', () => {
    expect(isValidSaveData({ ...validV1, paths: [] })).toBe(true);
    expect(isValidSaveData({ ...validV2, paths: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidSaveData(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isValidSaveData('string')).toBe(false);
    expect(isValidSaveData(42)).toBe(false);
    expect(isValidSaveData(undefined)).toBe(false);
  });

  it('returns false for wrong version', () => {
    expect(isValidSaveData({ ...validV1, version: 99 })).toBe(false);
  });

  it('returns false for missing version', () => {
    const { version, ...rest } = validV1;
    expect(isValidSaveData(rest)).toBe(false);
  });

  it('returns false for missing grid', () => {
    const { grid, ...rest } = validV1;
    expect(isValidSaveData({ ...rest, version: 1 })).toBe(false);
  });

  it('returns false for null grid', () => {
    expect(isValidSaveData({ ...validV1, grid: null })).toBe(false);
  });

  it('returns false for non-array paths', () => {
    expect(isValidSaveData({ ...validV1, paths: 'not-array' })).toBe(false);
  });

  it('returns false for invalid orientation in v1', () => {
    const data = {
      ...validV1,
      grid: { ...validV1.grid, orientation: 'invalid' },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it('returns false when grid.cols is not a number', () => {
    const data = {
      ...validV1,
      grid: { ...validV1.grid, cols: 'sixteen' },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it('returns false when grid.rows is not a number', () => {
    const data = {
      ...validV1,
      grid: { ...validV1.grid, rows: null },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it('returns false when grid.tileSize is not a number', () => {
    const data = {
      ...validV1,
      grid: { ...validV1.grid, tileSize: true },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it('returns false when a path is null', () => {
    expect(isValidSaveData({ ...validV1, paths: [null] })).toBe(false);
  });

  it('returns false when a path is missing id', () => {
    const badPath = { cells: [], color: '#000', height: 1 };
    expect(isValidSaveData({ ...validV1, paths: [badPath] })).toBe(false);
  });

  it('returns false when path.id is not a string', () => {
    const badPath = { id: 123, cells: [], color: '#000', height: 1 };
    expect(isValidSaveData({ ...validV1, paths: [badPath] })).toBe(false);
  });

  it('returns false when path.color is not a string', () => {
    const badPath = { id: 'p-1', cells: [], color: 0xff, height: 1 };
    expect(isValidSaveData({ ...validV1, paths: [badPath] })).toBe(false);
  });

  it('returns false when path.height is not a number', () => {
    const badPath = { id: 'p-1', cells: [], color: '#000', height: 'tall' };
    expect(isValidSaveData({ ...validV1, paths: [badPath] })).toBe(false);
  });

  it('returns false when path.cells is not an array', () => {
    const badPath = { id: 'p-1', cells: 'none', color: '#000', height: 1 };
    expect(isValidSaveData({ ...validV1, paths: [badPath] })).toBe(false);
  });

  it('accepts paths without a depth field (backwards compatibility)', () => {
    const data = {
      ...validV1,
      paths: [{ id: 'path-1', cells: [], color: '#000', height: 1 }],
    };
    expect(isValidSaveData(data)).toBe(true);
  });

  it('accepts paths with a numeric depth field', () => {
    const data = {
      ...validV1,
      paths: [{ id: 'path-1', cells: [], color: '#000', height: 1, depth: 5 }],
    };
    expect(isValidSaveData(data)).toBe(true);
  });

  it('rejects paths with a non-numeric depth field', () => {
    const data = {
      ...validV1,
      paths: [
        { id: 'path-1', cells: [], color: '#000', height: 1, depth: 'deep' },
      ],
    };
    expect(isValidSaveData(data)).toBe(false);
  });
});
