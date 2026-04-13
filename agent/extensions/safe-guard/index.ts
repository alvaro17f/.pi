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
  /\brm\s+-[a-zA-Z]*f/,                    // rm -f, rm -rf, rm -fR etc.
  /\brm\s+.*--force\b/,                      // rm --force
  /\bsudo\s+rm\b/,                           // sudo rm
  /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i,     // SQL destructive
  /\bchmod\s+777\b/,                         // chmod 777
  /\bmkfs\b/,                                // mkfs
  /\bdd\s+if=/,                              // dd
  />\s*\/dev\/sd[a-z]/,                      // redirect to disk
];

export const PROTECTED_PATHS = [".env", ".git/", "node_modules/", ".pi/", "id_rsa", ".ssh/"];

/** Path-separator-aware matching to avoid false positives like `my.git/` or `id_rsa_backup`. */
function isProtectedPath(filePath: string, pattern: string): boolean {
  if (pattern.endsWith("/")) {
    const dirName = pattern.slice(0, -1); // e.g. ".ssh" from ".ssh/"
    return (
      filePath.startsWith(pattern) ||                    // .ssh/config
      filePath.startsWith(dirName + "/") ||            // .ssh/config (no leading slash)
      filePath.includes("/" + pattern) ||               // foo/.ssh/bar
      filePath.includes("/" + dirName + "/")           // foo/.ssh/bar
    );
  } else {
    return filePath === pattern || filePath.endsWith("/" + pattern) || filePath.startsWith(pattern + "/");
  }
}

let enabled = true;

export default function (pi: ExtensionAPI) {
  const stored = getExtSetting("safeGuard", true);
  enabled = typeof stored === "boolean" ? stored : true;

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
      const cmd =
        (typeof event.input === "object" && event.input !== null && "command" in event.input)
          ? String((event.input as { command: string }).command)
          : "";
      const match = DANGEROUS_PATTERNS.find((p) => p.test(cmd));
      if (match && ctx.hasUI) {
        const ok = await ctx.ui.confirm("Dangerous Command", `Execute: ${cmd}?`);
        if (!ok) {
          return { block: true, reason: "Blocked by user" };
        }
      }
    }

    if (event.toolName === "write" || event.toolName === "edit") {
      const filePath =
        (typeof event.input === "object" && event.input !== null && "path" in event.input)
          ? String((event.input as { path: string }).path)
          : "";
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