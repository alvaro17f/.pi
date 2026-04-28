/**
 * Header extension — exact pi-pane header (logo + startup sections).
 * Adapted from https://github.com/visua1hue/pi-pane
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Spacer, type TUI } from "@mariozechner/pi-tui";
import { renderHeader, patchStartupListing, type ListingRef } from "./startup.js";

const g = globalThis as any;

// ── Intercept "Model scope:" console.log before InteractiveMode starts ─────
const MODEL_SCOPE_RE = /Model scope:\s*(.+)/;
const CAPTURED_MODELS = Symbol.for("pi-pane:capturedModels");
const PATCHED_LOG = Symbol.for("pi-pane:logPatched");

if (!g[PATCHED_LOG]) {
  g[PATCHED_LOG] = true;
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === "string") {
      const plain = args[0].replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
      const m = MODEL_SCOPE_RE.exec(plain);
      if (m) {
        const raw = m[1].replace(/\s*\(Ctrl\+\w[\w\s]*\)/gi, "");
        g[CAPTURED_MODELS] = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
        return; // suppress
      }
    }
    origLog.apply(console, args);
  };
}

// ── Suppress render frames (startup flash + /reload loader) ─────────────────
const STDOUT_RESTORE = Symbol.for("pi-pane:stdoutRestore");
const ANSI_SEQ_RE = /\x1b(?:\[[^a-zA-Z~]*[a-zA-Z~]|\][^\x07]*\x07)/g;

function suppressStdout(): void {
  if (g[STDOUT_RESTORE]) return;
  const origWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = function (chunk: any, ...args: any[]): boolean {
    const str = typeof chunk === "string"
      ? chunk
      : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : null;
    if (str !== null && /\S/.test(str.replace(ANSI_SEQ_RE, ""))) return true;
    return origWrite(chunk, ...args);
  } as typeof process.stdout.write;

  const safetyTimer = setTimeout(() => {
    process.stdout.write = origWrite;
    delete g[STDOUT_RESTORE];
  }, 5000);

  g[STDOUT_RESTORE] = () => {
    clearTimeout(safetyTimer);
    process.stdout.write = origWrite;
    delete g[STDOUT_RESTORE];
  };
}

// Don't suppress stdout for non-interactive CLI modes (--help, --version, install, etc.)
const NON_INTERACTIVE_FLAGS = /--help|-h|--version|-v|install|uninstall|update|doctor|login|logout|whoami|config|init|publish/;
if (!NON_INTERACTIVE_FLAGS.test(process.argv.slice(2).join(" "))) {
  suppressStdout();
}

export default function headerExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const capturedModels: string[] | undefined = g[CAPTURED_MODELS];
    const initialSections = capturedModels?.length
      ? [{ name: "Models" as const, items: capturedModels }]
      : [];
    const listingRef: ListingRef = {
      sections: initialSections,
      frame: 0,
      revealed: false,
      revealedAt: 0,
      scaffoldAt: 0,
      settled: false,
    };
    let tuiRef: TUI | undefined;

    ctx.ui.setHeader((tui, theme) => {
      tuiRef = tui;

      // Neuter built-in header so /reload doesn't flash keybinding hints
      const hc = tui.children[0] as any;
      if (hc?.children) {
        for (const child of hc.children) {
          if (child instanceof Spacer) continue;
          if ((child as any)._piPane) continue;
          child.render = () => [""];
        }
      }

      patchStartupListing(tui, theme, listingRef);

      return {
        _piPane: true,
        render: (w: number) => renderHeader(theme, listingRef, w),
        invalidate() {},
        dispose() { suppressStdout(); },
      } as any;
    });

    // Restore stdout + force full redraw
    const restoreStdout: (() => void) | undefined = g[STDOUT_RESTORE];
    if (restoreStdout) {
      restoreStdout();
      if (tuiRef) (tuiRef as any).requestRender(true);
    }
  });

  // Command to restore built-in header
  pi.registerCommand("builtin-header", {
    description: "Restore built-in pi header",
    handler: async (_args, cmdCtx) => {
      cmdCtx.ui.setHeader(undefined);
      cmdCtx.ui.notify("Built-in header restored", "info");
    },
  });
}
