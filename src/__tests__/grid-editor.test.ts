import { describe, it, expect } from "vitest";
import { axisLabels } from "../grid-editor.ts";

describe("axisLabels", () => {
  it("returns X/Z for xz orientation", () => {
    expect(axisLabels("xz")).toEqual({ h: "X", v: "Z" });
  });

  it("returns X/Y for xy orientation", () => {
    expect(axisLabels("xy")).toEqual({ h: "X", v: "Y" });
  });

  it("returns Y/Z for yz orientation", () => {
    expect(axisLabels("yz")).toEqual({ h: "Y", v: "Z" });
  });
});
