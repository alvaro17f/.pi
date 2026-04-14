/**
 * Notifications Extension
 *
 * Desktop notifications via OSC 99 (Kitty) / OSC 777 (iTerm2, foot, WezTerm, etc.)
 * when the agent finishes a turn.
 *
 * Commands:
 *   /notifications        → toggle on/off
 *   /notifications on     → enable
 *   /notifications off    → disable
 *   /notifications status → show current state
 *
 * State persisted in extensionSettings.notifications (settings.json).
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

function sanitizeTerminal(str: string): string {
  return str.replace(/[\x00-\x1f\x7f]/g, "");
}

function terminalNotify(title: string, body: string): void {
  if (!process.stdout.isTTY) return;
  const s = (s: string) => sanitizeTerminal(s);
  if (process.env.KITTY_WINDOW_ID) {
    process.stdout.write(`\x1b]99;i=1:d=0;${s(title)}\x1b\\`);
    process.stdout.write(`\x1b]99;i=1:p=body;${s(body)}\x1b\\`);
  } else {
    process.stdout.write(`\x1b]777;notify;${s(title)};${s(body)}\x07`);
  }
}

const SUBCOMMANDS: AutocompleteItem[] = [
  { value: "on", label: "on" },
  { value: "off", label: "off" },
  { value: "status", label: "status" },
];

export default function (pi: ExtensionAPI) {
  let turnCount = 0;

  pi.on("turn_start", () => {
    turnCount++;
  });

  pi.on("agent_end", () => {
    if (!process.stdout.isTTY || turnCount === 0) {
      turnCount = 0;
      return;
    }
    if (getExtSetting("notifications", true)) {
      terminalNotify("pi", `Done after ${turnCount} turn(s). Ready for input.`);
    }
    turnCount = 0;
  });

  pi.registerCommand("notifications", {
    description: "Desktop notifications: /notifications [on|off|status] (no arg = toggle)",
    getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
      const filtered = SUBCOMMANDS.filter((i) => i.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      const current = getExtSetting("notifications", true);
      const label = (v: boolean) => v ? "enabled" : "disabled";

      if (arg === "status") {
        ctx.ui.notify(`Notifications: ${current ? "on" : "off"}`, "info");
        return;
      }

      const next = arg === "on" ? true : arg === "off" ? false : !current;
      if (next !== current) setExtSetting("notifications", next);
      ctx.ui.notify(`Notifications ${label(next)}`, "info");
    },
  });
}