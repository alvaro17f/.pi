import { describe, expect, it, vi } from "vitest";
import { terminalNotify, formatTurnMessage } from "./index.js";

describe("terminalNotify", () => {
  it("should use OSC 99 for Kitty terminals", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const originalKitty = process.env.KITTY_WINDOW_ID;
    process.env.KITTY_WINDOW_ID = "1";

    terminalNotify("test", "body");

    expect(writeSpy).toHaveBeenCalledWith("\x1b]99;i=1:d=0;test\x1b\\");
    expect(writeSpy).toHaveBeenCalledWith("\x1b]99;i=1:p=body;body\x1b\\");

    process.env.KITTY_WINDOW_ID = originalKitty;
    writeSpy.mockRestore();
  });

  it("should use OSC 777 for non-Kitty terminals", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const originalKitty = process.env.KITTY_WINDOW_ID;
    delete process.env.KITTY_WINDOW_ID;

    terminalNotify("test", "body");

    expect(writeSpy).toHaveBeenCalledWith("\x1b]777;notify;test;body\x07");

    process.env.KITTY_WINDOW_ID = originalKitty;
    writeSpy.mockRestore();
  });
});

describe("formatTurnMessage", () => {
  it("should format turn count message", () => {
    expect(formatTurnMessage(1)).toBe("Done after 1 turn(s). Ready for input.");
    expect(formatTurnMessage(5)).toBe("Done after 5 turn(s). Ready for input.");
    expect(formatTurnMessage(10)).toBe("Done after 10 turn(s). Ready for input.");
  });
});
