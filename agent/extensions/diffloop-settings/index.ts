/**
 * Diffloop Settings — persists diffloop enabled state in settings.json.
 *
 * Diffloop doesn't persist its own state. This extension bridges that gap
 * by auto-executing /diffloop off at startup when the saved state is false,
 * and persisting /diffloop commands to settings.json.
 *
 * State is stored under extensions.diffloop in settings.json.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

export default function (pi: ExtensionAPI) {
  // Persist state changes when user runs /diffloop
  pi.on("input", async (event) => {
    const text = event.text.trim().toLowerCase();
    if (!text.startsWith("/diffloop")) return;

    const arg = text.replace(/^\/diffloop\s*/, "").trim();
    if (arg === "on" || arg === "enable" || arg === "enabled") {
      setExtSetting("diffloop", true);
    } else if (arg === "off" || arg === "disable" || arg === "disabled") {
      setExtSetting("diffloop", false);
    } else if (arg === "toggle" || arg === "") {
      const current = getExtSetting("diffloop", true) as boolean;
      setExtSetting("diffloop", !current);
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