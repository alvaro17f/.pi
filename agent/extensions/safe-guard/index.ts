/**
 * Safe Guard Extension
 *
 * Two-layer protection for dangerous operations:
 * 1. Command guard — detects destructive bash patterns (rm -rf, DROP TABLE, etc.)
 *    and prompts for confirmation in interactive mode
 * 2. Path guard — blocks writes to sensitive paths (.env, .git/, .ssh/, etc.)
 *    with user confirmation in interactive mode, or outright blocking in headless mode
 *
 * /safe        — toggle on/off
 * /safe on     — enable
 * /safe off    — disable
 * /safe status — show current state
 *
 * State persisted in settings.json as safeGuard.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

export const DANGEROUS_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*-rf\b|.*--force\b)/,
  /\bsudo\s+rm\b/,
  /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,
  /\bchmod\s+777\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd[a-z]/,
];

export const PROTECTED_PATHS = [".env", ".git/", "node_modules/", ".pi/", "id_rsa", ".ssh/"];

const settingsPath = getAgentDir() + "/settings.json";

function loadSettings(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

let enabled = true;

export default function (pi: ExtensionAPI) {
  const settings = loadSettings();
  enabled = (settings.safeGuard as boolean) ?? true;

  pi.registerCommand("safe", {
    description: "Toggle safe-guard on/off",
    getArgumentCompletions: (prefix) => {
      const options = [
        { value: "on", label: "on" },
        { value: "off", label: "off" },
        { value: "status", label: "status" },
      ];
      return options.filter((o) => o.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      const arg = args?.trim().toLowerCase() || "";

      if (arg === "status") {
        const current = loadSettings();
        const persisted = current.safeGuard as boolean | undefined;
        ctx.ui.notify(`safe-guard: ${enabled ? "enabled" : "disabled"} (settings.json: ${persisted ?? "unset"})`, "info");
        return;
      } else if (arg === "on") {
        enabled = true;
      } else if (arg === "off") {
        enabled = false;
      } else {
        enabled = !enabled;
      }

      const updated = loadSettings();
      updated.safeGuard = enabled;
      saveSettings(updated);
      ctx.ui.notify(`safe-guard ${enabled ? "enabled" : "disabled"}`, "info");
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!enabled) return;

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

    if (event.toolName === "write" || event.toolName === "edit") {
      const filePath = (event.input as { path?: string }).path ?? "";
      const hit = PROTECTED_PATHS.find((p) => p.endsWith("/") ? filePath.includes("/" + p) || filePath.startsWith(p) : filePath.endsWith("/" + p) || filePath.startsWith(p));
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