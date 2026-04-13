/**
 * Diffloop Settings — persists diffloop enabled state in settings.json.
 *
 * Provides /dls command as a proxy for /diffloop that also persists state.
 * On startup, auto-executes /diffloop off if saved state is false.
 *
 * Why /dls? pi skips the input event for extension commands, so we can't
 * detect /diffloop usage directly. /dls persists state AND forwards to
 * /diffloop automatically.
 *
 * State is stored under extensionSettings.diffloop in settings.json.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

type DiffloopAction = "on" | "off" | "toggle" | "status" | "invalid";

function parseAction(args: string | undefined): DiffloopAction {
  const arg = (args ?? "").trim().toLowerCase();
  if (!arg || arg === "status") return "status";
  if (arg === "on" || arg === "enable" || arg === "enabled") return "on";
  if (arg === "off" || arg === "disable" || arg === "disabled") return "off";
  if (arg === "toggle") return "toggle";
  return "invalid";
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("dls", {
    description: "Diffloop save — toggle diffloop AND persist state",
    getArgumentCompletions: (prefix) => {
      const options = [
        { value: "on", label: "on" },
        { value: "off", label: "off" },
        { value: "toggle", label: "toggle" },
        { value: "status", label: "status" },
      ];
      return options.filter((o) => o.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      const action = parseAction(args);
      if (action === "invalid") {
        ctx.ui.notify("Usage: /dls [on|off|toggle|status]", "error");
        return;
      }

      if (action === "status") {
        const saved = getExtSetting("diffloop", "unset");
        ctx.ui.notify(`diffloop saved state: ${saved}`, "info");
        return;
      }

      const current = getExtSetting("diffloop", true) as boolean;
      const newState = action === "toggle" ? !current : action === "on";
      setExtSetting("diffloop", newState);

      // Forward to /diffloop by pre-filling editor + auto-submit
      const cmd = newState ? "/diffloop on" : "/diffloop off";
      ctx.ui.setEditorText(cmd);

      const unsub = ctx.ui.onTerminalInput(() => {
        unsub();
        return { data: "\r" };
      });

      setTimeout(() => process.stdout.write("\x1b[6n"), 100);
      setTimeout(() => unsub(), 3000);
    },
  });

  // Restore saved state on startup.
  // Diffloop defaults to enabled=true. If saved state is false,
  // auto-execute /diffloop off.
  pi.on("session_start", async (event, ctx) => {
    if (event.reason !== "startup") return;
    if (!ctx.hasUI) return;

    const saved = getExtSetting("diffloop", true) as boolean;
    if (saved) return;

    ctx.ui.setEditorText("/diffloop off");

    const unsub = ctx.ui.onTerminalInput(() => {
      unsub();
      return { data: "\r" };
    });

    setTimeout(() => process.stdout.write("\x1b[6n"), 100);
    setTimeout(() => unsub(), 3000);
  });
}