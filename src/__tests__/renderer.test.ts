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
  describe("xz orientation (depth 0)", () => {
    it("maps col→X, row→Z, extrude up in -Y", () => {
      expect(voxelPosition(3, 5, 0, 0, "xz")).toEqual([3, 0, 5]);
      expect(voxelPosition(3, 5, 2, 0, "xz")).toEqual([3, -2, 5]);
    });
  });

  describe("xy orientation (depth 0)", () => {
    it("maps col→X, row→Y (inverted), extrude in -Z", () => {
      expect(voxelPosition(3, 5, 0, 0, "xy")).toEqual([3, -5, -0]);
      expect(voxelPosition(3, 5, 2, 0, "xy")).toEqual([3, -5, -2]);
    });
  });

  describe("yz orientation (depth 0)", () => {
    it("maps col→Y (inverted), row→Z, extrude in X", () => {
      expect(voxelPosition(3, 5, 0, 0, "yz")).toEqual([0, -3, 5]);
      expect(voxelPosition(3, 5, 2, 0, "yz")).toEqual([2, -3, 5]);
    });
  });

  it("handles zero values", () => {
    expect(voxelPosition(0, 0, 0, 0, "xz")).toEqual([0, 0, 0]);
    expect(voxelPosition(0, 0, 0, 0, "xy")).toEqual([0, -0, -0]);
    expect(voxelPosition(0, 0, 0, 0, "yz")).toEqual([0, -0, 0]);
  });

  describe("xz orientation with non-zero depth", () => {
    it("offsets voxels along Y axis", () => {
      // depth offsets along +Y
      expect(voxelPosition(3, 5, 0, 4, "xz")).toEqual([3, 4, 5]);
      expect(voxelPosition(3, 5, 2, 4, "xz")).toEqual([3, 2, 5]);
    });
  });

  describe("xy orientation with non-zero depth", () => {
    it("offsets voxels along -Z axis", () => {
      // depth offsets along -Z
      expect(voxelPosition(3, 5, 0, 4, "xy")).toEqual([3, -5, -4]);
      expect(voxelPosition(3, 5, 2, 4, "xy")).toEqual([3, -5, -6]);
    });
  });

  describe("yz orientation with non-zero depth", () => {
    it("offsets voxels along +X axis", () => {
      // depth offsets along +X
      expect(voxelPosition(3, 5, 0, 4, "yz")).toEqual([4, -3, 5]);
      expect(voxelPosition(3, 5, 2, 4, "yz")).toEqual([6, -3, 5]);
    });
  });
});

// ─── planePosition ──────────────────────────────────────────────────────────

describe("planePosition", () => {
  it("returns correct position and size for xz", () => {
    const p = planePosition(3, 16, 16, "xz");
    expect(p.position).toEqual([7.5, 3, 7.5]);
    expect(p.size).toEqual([16, 0.05, 16]);
  });

  it("returns correct position and size for xy", () => {
    const p = planePosition(3, 16, 16, "xy");
    expect(p.position).toEqual([7.5, -7.5, -3]);
    expect(p.size).toEqual([16, 16, 0.05]);
  });

  it("returns correct position and size for yz", () => {
    const p = planePosition(3, 16, 16, "yz");
    expect(p.position).toEqual([3, -7.5, 7.5]);
    expect(p.size).toEqual([0.05, 16, 16]);
  });
});

// ─── cameraAngle ─────────────────────────────────────────────────────────────

describe("cameraAngle", () => {
  it("returns 45 for xz with no delta", () => {
    expect(cameraAngle("xz")).toBe(45);
  });

  it("returns 30 for xy with no delta", () => {
    expect(cameraAngle("xy")).toBe(30);
  });

  it("returns 60 for yz with no delta", () => {
    expect(cameraAngle("yz")).toBe(60);
  });

  it("adds delta to base angle", () => {
    expect(cameraAngle("xz", 10)).toBe(55);
    expect(cameraAngle("xz", -10)).toBe(35);
  });

  it("clamps result to minimum 1°", () => {
    // xy base is 30, delta -40 would give -10 → clamp to 1
    expect(cameraAngle("xy", -40)).toBe(1);
  });

  it("clamps result to maximum 89°", () => {
    // yz base is 60, delta +40 would give 100 → clamp to 89
    expect(cameraAngle("yz", 40)).toBe(89);
  });
});

// ─── cameraConfig ────────────────────────────────────────────────────────────

describe("cameraConfig", () => {
  it("returns type and angle for isometric xz", () => {
    expect(cameraConfig("isometric", "xz")).toEqual({
      type: "isometric",
      angle: 45,
    });
  });

  it("returns type and angle for oblique xy", () => {
    expect(cameraConfig("oblique", "xy")).toEqual({
      type: "oblique",
      angle: 30,
    });
  });

  it("returns type and angle for orthographic yz", () => {
    expect(cameraConfig("orthographic", "yz")).toEqual({
      type: "orthographic",
      angle: 60,
    });
  });

  it("includes delta in the angle", () => {
    expect(cameraConfig("isometric", "xz", 15)).toEqual({
      type: "isometric",
      angle: 60,
    });
  });
});
