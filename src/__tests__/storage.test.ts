import { describe, it, expect } from "vitest";
import { isValidSaveData } from "../storage.ts";

describe("isValidSaveData", () => {
  const validData = {
    version: 1,
    grid: { cols: 16, rows: 16, tileSize: 32, orientation: "xz" },
    paths: [
      {
        id: "path-1",
        cells: [{ col: 0, row: 0 }],
        color: "#4477bb",
        height: 2,
      },
    ],
  };

  it("returns true for valid data", () => {
    expect(isValidSaveData(validData)).toBe(true);
  });

  it("returns true for valid data with empty paths array", () => {
    expect(isValidSaveData({ ...validData, paths: [] })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isValidSaveData(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isValidSaveData("string")).toBe(false);
    expect(isValidSaveData(42)).toBe(false);
    expect(isValidSaveData(undefined)).toBe(false);
  });

  it("returns false for wrong version", () => {
    expect(isValidSaveData({ ...validData, version: 2 })).toBe(false);
  });

  it("returns false for missing version", () => {
    const { version, ...rest } = validData;
    expect(isValidSaveData(rest)).toBe(false);
  });

  it("returns false for missing grid", () => {
    const { grid, ...rest } = validData;
    expect(isValidSaveData({ ...rest, version: 1 })).toBe(false);
  });

  it("returns false for null grid", () => {
    expect(isValidSaveData({ ...validData, grid: null })).toBe(false);
  });

  it("returns false for non-array paths", () => {
    expect(isValidSaveData({ ...validData, paths: "not-array" })).toBe(false);
  });

  it("returns false for invalid orientation", () => {
    const data = {
      ...validData,
      grid: { ...validData.grid, orientation: "invalid" },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it("returns false when grid.cols is not a number", () => {
    const data = {
      ...validData,
      grid: { ...validData.grid, cols: "sixteen" },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it("returns false when grid.rows is not a number", () => {
    const data = {
      ...validData,
      grid: { ...validData.grid, rows: null },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it("returns false when grid.tileSize is not a number", () => {
    const data = {
      ...validData,
      grid: { ...validData.grid, tileSize: true },
    };
    expect(isValidSaveData(data)).toBe(false);
  });

  it("returns false when a path is null", () => {
    expect(isValidSaveData({ ...validData, paths: [null] })).toBe(false);
  });

  it("returns false when a path is missing id", () => {
    const badPath = { cells: [], color: "#000", height: 1 };
    expect(isValidSaveData({ ...validData, paths: [badPath] })).toBe(false);
  });

  it("returns false when path.id is not a string", () => {
    const badPath = { id: 123, cells: [], color: "#000", height: 1 };
    expect(isValidSaveData({ ...validData, paths: [badPath] })).toBe(false);
  });

  it("returns false when path.color is not a string", () => {
    const badPath = { id: "p-1", cells: [], color: 0xff, height: 1 };
    expect(isValidSaveData({ ...validData, paths: [badPath] })).toBe(false);
  });

  it("returns false when path.height is not a number", () => {
    const badPath = { id: "p-1", cells: [], color: "#000", height: "tall" };
    expect(isValidSaveData({ ...validData, paths: [badPath] })).toBe(false);
  });

  it("returns false when path.cells is not an array", () => {
    const badPath = { id: "p-1", cells: "none", color: "#000", height: 1 };
    expect(isValidSaveData({ ...validData, paths: [badPath] })).toBe(false);
  });
});
