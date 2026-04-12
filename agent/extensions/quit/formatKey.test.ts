import { describe, expect, it } from "vitest";

function formatKey(key: string | undefined): string {
  if (!key) return "that key";

  return key
    .split("+")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ctrl") return "Ctrl";
      if (lower === "alt") return "Alt";
      if (lower === "shift") return "Shift";
      if (lower === "cmd" || lower === "meta") return "Cmd";
      if (part.length === 1) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("+");
}

describe("formatKey", () => {
  it("should format ctrl+c", () => {
    expect(formatKey("ctrl+c")).toBe("Ctrl+C");
  });

  it("should format ctrl+q", () => {
    expect(formatKey("ctrl+q")).toBe("Ctrl+Q");
  });

  it("should handle undefined", () => {
    expect(formatKey(undefined)).toBe("that key");
  });

  it("should handle empty string", () => {
    expect(formatKey("")).toBe("that key");
  });

  it("should format multi-part keys", () => {
    expect(formatKey("ctrl+shift+q")).toBe("Ctrl+Shift+Q");
  });
});
