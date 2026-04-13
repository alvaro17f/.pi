/**
 * Safe Guard Extension
 *
 * Two-layer protection for dangerous operations.
 *
 * /safe        — toggle on/off
 * /safe on     — enable
 * /safe off    — disable
 * /safe status — show current state
 *
 * State persisted in settings.json under extensions.safeGuard.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

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

/** Path-separator-aware matching to avoid false positives like `my.git/` or `id_rsa_backup`. */
function isProtectedPath(filePath: string, pattern: string): boolean {
  if (pattern.endsWith("/")) {
    return filePath.startsWith(pattern) || filePath.includes("/" + pattern);
  } else {
    return filePath === pattern || filePath.endsWith("/" + pattern) || filePath.startsWith(pattern + "/");
  }
}

let enabled = true;

export default function (pi: ExtensionAPI) {
  enabled = (getExtSetting("safeGuard", true) as boolean) ?? true;

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
        const persisted = getExtSetting("safeGuard", "unset");
        ctx.ui.notify(`safe-guard: ${enabled ? "enabled" : "disabled"} (settings.json: ${persisted})`, "info");
        return;
      } else if (arg === "on") {
        enabled = true;
      } else if (arg === "off") {
        enabled = false;
      } else {
        enabled = !enabled;
      }

      setExtSetting("safeGuard", enabled);
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
      const hit = PROTECTED_PATHS.find((p) => isProtectedPath(filePath, p));
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