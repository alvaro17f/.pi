/**
 * Safe Guard Extension
 *
 * Two-layer protection for dangerous operations:
 * 1. Command guard — detects destructive bash patterns (rm -rf, DROP TABLE, etc.)
 *    and prompts for confirmation in interactive mode
 * 2. Path guard — blocks writes to sensitive paths (.env, .git/, .ssh/, etc.)
 *    with user confirmation in interactive mode, or outright blocking in headless mode
 *
 * /safe — toggle safe-guard on/off (persisted in settings.json)
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSettingsPath } from "@mariozechner/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

/** Regex patterns that match potentially destructive bash commands. */
export const DANGEROUS_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\b|.*--force\b)/,
  /\bsudo\s+rm\b/,
  /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
  /\bchmod\s+777\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd[a-z]/,
];

/** File paths that should never be written to without explicit confirmation. */
export const PROTECTED_PATHS = [".env", ".git/", "node_modules/", ".pi/", "id_rsa", ".ssh/"];

function loadSettings(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(getSettingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2) + "\n");
}

let enabled = true;

/**
 * Extension entry point.
 */
export default function (pi: ExtensionAPI) {
  // Restore persisted state
  const settings = loadSettings();
  enabled = (settings.safeGuard as boolean) ?? true;

  pi.registerCommand("safe", {
    description: "Toggle safe-guard on/off",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      const updated = loadSettings();
      updated.safeGuard = enabled;
      saveSettings(updated);
      ctx.ui.showMessage(`safe-guard ${enabled ? "enabled" : "disabled"}`);
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!enabled) return;

    // Check bash commands for dangerous patterns
    if (event.toolName === "bash") {
      const cmd = (event.input as { command?: string }).command ?? "";
      const match = DANGEROUS_PATTERNS.find((p) => p.test(cmd));
      if (match && ctx.hasUI) {
        const ok = await ctx.ui.confirm("Dangerous Command", `Execute: ${cmd}?`);
        if (!ok) {
          return { block: true, reason: "Blocked by user" };
        }
      }
    }

    // Check write/edit for protected paths
    if (event.toolName === "write" || event.toolName === "edit") {
      const filePath = (event.input as { path?: string }).path ?? "";
      const hit = PROTECTED_PATHS.find((p) => filePath.includes(p));
      if (hit) {
        if (ctx.hasUI) {
          const ok = await ctx.ui.confirm("Protected Path", `Allow write to ${filePath}?`);
          if (!ok) {
            return { block: true, reason: `Protected path: ${hit}` };
          }
        } else {
          return { block: true, reason: `Protected path: ${hit}` };
        }
      }
    }
  });
}