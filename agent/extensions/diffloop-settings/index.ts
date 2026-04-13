/**
 * Diffloop Settings — persists diffloop enabled state in settings.json.
 *
 * Diffloop doesn't persist its own state. This extension bridges that gap
 * by auto-executing /diffloop off at startup when the saved state is false,
 * and persisting state changes detected from session entries.
 *
 * State is stored under extensionSettings.diffloop in settings.json.
 *
 * Limitation: pi's input event is skipped when an extension command matches,
 * so we can't intercept /diffloop directly. Instead, we scan session entries
 * after each agent turn for /diffloop command usage and infer the state.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

export default function (pi: ExtensionAPI) {
  // After each agent turn, scan session entries for /diffloop commands
  // and persist the inferred state.
  pi.on("turn_end", async (_event, ctx) => {
    const branch = ctx.sessionManager.getBranch();
    // Walk entries in reverse to find the most recent /diffloop command
    for (let i = branch.length - 1; i >= 0; i--) {
      const entry = branch[i];
      if (entry.type === "message" && entry.message.role === "user") {
        const text = (entry.message.content as Array<{ type: string; text?: string }>)
          ?.filter((c): c is { type: "text"; text: string } => c.type === "text")
          ?.map((c) => c.text)
          ?.join(" ") ?? "";
        const lower = text.trim().toLowerCase();
        if (lower.startsWith("/diffloop")) {
          const arg = lower.replace(/^\/diffloop\s*/, "").trim();
          if (arg === "on" || arg === "enable" || arg === "enabled") {
            setExtSetting("diffloop", true);
          } else if (arg === "off" || arg === "disable" || arg === "disabled") {
            setExtSetting("diffloop", false);
          } else if (arg === "toggle" || arg === "") {
            // Toggle: read current and flip
            const current = getExtSetting("diffloop", true) as boolean;
            setExtSetting("diffloop", !current);
          }
          break; // Only process the most recent /diffloop command
        }
      }
    }
  });

  // Restore saved state on startup.
  // Diffloop defaults to enabled=true. If saved state is false,
  // pre-fill editor with /diffloop off + auto-submit.
  pi.on("session_start", async (event, ctx) => {
    if (event.reason !== "startup") return;
    if (!ctx.hasUI) return;

    const saved = getExtSetting("diffloop", true) as boolean;
    if (saved) return; // diffloop is already enabled by default

    ctx.ui.setEditorText("/diffloop off");

    const unsub = ctx.ui.onTerminalInput(() => {
      unsub();
      return { data: "\r" };
    });

    // Trigger terminal response for auto-submit
    setTimeout(() => process.stdout.write("\x1b[6n"), 100);

    // Fallback cleanup
    setTimeout(() => unsub(), 3000);
  });
}