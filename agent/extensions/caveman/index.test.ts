import { describe, expect, it } from "vitest";
import { INSTRUCTIONS, formatLevel, detectCavemanTrigger } from "./index.js";

describe("INSTRUCTIONS", () => {
  it("should have non-empty instructions for each level except off", () => {
    expect(INSTRUCTIONS.off).toBe("");
    expect(INSTRUCTIONS.lite.length).toBeGreaterThan(0);
    expect(INSTRUCTIONS.full.length).toBeGreaterThan(0);
    expect(INSTRUCTIONS.ultra.length).toBeGreaterThan(0);
  });
});

describe("formatLevel", () => {
  it("should format off level", () => {
    expect(formatLevel("off")).toBe("Normal mode. Caveman go away.");
  });

  it("should format lite level", () => {
    expect(formatLevel("lite")).toBe("Caveman Lite active. Drop filler, keep grammar.");
  });

  it("should format full level", () => {
    expect(formatLevel("full")).toBe("Caveman mode active. Drop articles, fragments ok.");
  });

  it("should format ultra level", () => {
    expect(formatLevel("ultra")).toBe("Caveman Ultra active. Maximum compression.");
  });
});

describe("detectCavemanTrigger", () => {
  it("should detect caveman mode trigger", () => {
    expect(detectCavemanTrigger("use caveman mode")).toEqual({ level: "full", stopped: false });
  });

  it("should detect lite level", () => {
    expect(detectCavemanTrigger("talk like caveman lite")).toEqual({ level: "lite", stopped: false });
  });

  it("should detect ultra level", () => {
    expect(detectCavemanTrigger("less tokens ultra")).toEqual({ level: "ultra", stopped: false });
  });

  it("should detect stop trigger", () => {
    expect(detectCavemanTrigger("stop caveman")).toEqual({ level: "off", stopped: true });
    expect(detectCavemanTrigger("normal mode")).toEqual({ level: "off", stopped: true });
  });

  it("should return null for neutral text", () => {
    expect(detectCavemanTrigger("hello world")).toBeNull();
    expect(detectCavemanTrigger("write some code")).toBeNull();
  });
});
