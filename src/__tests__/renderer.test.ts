import { describe, it, expect } from "vitest";
import { faceColors, voxelPosition, cameraAngle, cameraConfig, planePosition } from "../renderer.ts";

// ─── faceColors ──────────────────────────────────────────────────────────────

describe("faceColors", () => {
  it("returns top, side, and front keys", () => {
    const colors = faceColors("#4477bb");
    expect(colors).toHaveProperty("top");
    expect(colors).toHaveProperty("side");
    expect(colors).toHaveProperty("front");
  });

  it("side equals the base color", () => {
    const base = "#ff0000";
    const colors = faceColors(base);
    expect(colors.side).toBe(base);
  });

  it("top is lighter (oklch calc(l + 0.15))", () => {
    const colors = faceColors("#aabbcc");
    expect(colors.top).toContain("calc(l + 0.15)");
  });

  it("front is darker (oklch calc(l - 0.15))", () => {
    const colors = faceColors("#aabbcc");
    expect(colors.front).toContain("calc(l - 0.15)");
  });
});

// ─── voxelPosition ───────────────────────────────────────────────────────────

describe("voxelPosition", () => {
  it("maps col→X, row→Z, extrude up in -Y", () => {
    expect(voxelPosition(3, 5, 0, 0)).toEqual([3, -0, 5]);
    expect(voxelPosition(3, 5, 2, 0)).toEqual([3, -2, 5]);
  });

  it("handles zero values", () => {
    expect(voxelPosition(0, 0, 0, 0)).toEqual([0, -0, 0]);
  });

  it("offsets voxels along -Y axis with non-zero depth", () => {
    expect(voxelPosition(3, 5, 0, 4)).toEqual([3, -4, 5]);
    expect(voxelPosition(3, 5, 2, 4)).toEqual([3, -6, 5]);
  });
});

// ─── planePosition ──────────────────────────────────────────────────────────

describe("planePosition", () => {
  it("returns correct position, size, scale, and scaleOrigin", () => {
    const p = planePosition(3, 16, 16);
    expect(p.position).toEqual([0, -3, 0]);
    expect(p.size).toEqual([16, 1, 16]);
    expect(p.scale).toEqual([1, 0.1, 1]);
    expect(p.scaleOrigin).toEqual([0.5, 1, 0.5]);
  });

  it("aligns with voxel positions at depth 0", () => {
    const p = planePosition(0, 16, 16);
    expect(p.position).toEqual([0, -0, 0]);
  });
});

// ─── cameraAngle ─────────────────────────────────────────────────────────────

describe("cameraAngle", () => {
  it("returns 45 with no delta", () => {
    expect(cameraAngle()).toBe(45);
  });

  it("adds delta to base angle", () => {
    expect(cameraAngle(10)).toBe(55);
    expect(cameraAngle(-10)).toBe(35);
  });

  it("clamps result to minimum 1°", () => {
    expect(cameraAngle(-50)).toBe(1);
  });

  it("clamps result to maximum 89°", () => {
    expect(cameraAngle(50)).toBe(89);
  });
});

// ─── cameraConfig ────────────────────────────────────────────────────────────

describe("cameraConfig", () => {
  it("returns type and angle for isometric", () => {
    expect(cameraConfig("isometric")).toEqual({
      type: "isometric",
      angle: 45,
    });
  });

  it("returns type and angle for oblique", () => {
    expect(cameraConfig("oblique")).toEqual({
      type: "oblique",
      angle: 45,
    });
  });

  it("includes delta in the angle", () => {
    expect(cameraConfig("isometric", 15)).toEqual({
      type: "isometric",
      angle: 60,
    });
  });
});
