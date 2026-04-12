import { describe, expect, it } from "vitest";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m${rs > 0 ? `${rs}s` : ""}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h${rm > 0 ? `${rm}m` : ""}`;
}

function fmt(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

type UsageTotals = { input: number; output: number };

function accumulateUsage(totals: UsageTotals, message: { usage: { input?: number; output?: number } }): void {
  totals.input += Number(message.usage.input) || 0;
  totals.output += Number(message.usage.output) || 0;
}

describe("formatElapsed", () => {
  it("should format seconds", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(1000)).toBe("1s");
    expect(formatElapsed(59000)).toBe("59s");
  });

  it("should format minutes", () => {
    expect(formatElapsed(60000)).toBe("1m");
    expect(formatElapsed(90000)).toBe("1m30s");
    expect(formatElapsed(120000)).toBe("2m");
  });

  it("should format hours", () => {
    expect(formatElapsed(3600000)).toBe("1h");
    expect(formatElapsed(5400000)).toBe("1h30m");
    expect(formatElapsed(7200000)).toBe("2h");
  });
});

describe("fmt", () => {
  it("should format small numbers", () => {
    expect(fmt(0)).toBe("0");
    expect(fmt(500)).toBe("500");
    expect(fmt(999)).toBe("999");
  });

  it("should format large numbers with k suffix", () => {
    expect(fmt(1000)).toBe("1.0k");
    expect(fmt(1500)).toBe("1.5k");
    expect(fmt(9999)).toBe("10.0k");
  });
});

describe("accumulateUsage", () => {
  it("should accumulate token counts", () => {
    const totals: UsageTotals = { input: 0, output: 0 };
    const msg1 = { usage: { input: 100, output: 50 } };
    const msg2 = { usage: { input: 200, output: 75 } };

    accumulateUsage(totals, msg1);
    accumulateUsage(totals, msg2);

    expect(totals.input).toBe(300);
    expect(totals.output).toBe(125);
  });

  it("should handle undefined/NaN values", () => {
    const totals: UsageTotals = { input: 0, output: 0 };
    const msg = { usage: { input: undefined, output: NaN } };

    accumulateUsage(totals, msg);

    expect(totals.input).toBe(0);
    expect(totals.output).toBe(0);
  });
});
