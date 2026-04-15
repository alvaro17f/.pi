/**
 * Notifications Extension
 *
 * Desktop notification when the agent finishes a turn.
 * Uses OSC 777 escape sequence (Ghostty, iTerm2, WezTerm, rxvt-unicode, foot).
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
import { Markdown, type MarkdownTheme } from "@mariozechner/pi-tui";
import { getExtSetting, setExtSetting } from "../extension-settings/index.js";

// ── OSC 777 notification ──────────────────────────────────────────────

function sanitizeTerminal(str: string): string {
  return str.replace(/[\x00-\x1f\x7f]/g, "");
}

const notify = (title: string, body: string): void => {
  if (!process.stdout.isTTY) return;
  const s = (v: string) => sanitizeTerminal(v);
  process.stdout.write(`\x1b]777;notify;${s(title)};${s(body)}\x07`);
};

// ── Extract last assistant text ───────────────────────────────────────

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
  Boolean(part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part);

const extractLastAssistantText = (messages: Array<{ role?: string; content?: unknown }>): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role !== "assistant") continue;

    const content = message.content;
    if (typeof content === "string") return content.trim() || null;
    if (Array.isArray(content)) {
      const text = content.filter(isTextPart).map((p) => p.text).join("\n").trim();
      return text || null;
    }
    return null;
  }
  return null;
};

// ── Markdown → plain text ─────────────────────────────────────────────

const plainMarkdownTheme: MarkdownTheme = {
  heading: (text) => text,
  link: (text) => text,
  linkUrl: () => "",
  code: (text) => text,
  codeBlock: (text) => text,
  codeBlockBorder: () => "",
  quote: (text) => text,
  quoteBorder: () => "",
  hr: () => "",
  listBullet: () => "",
  bold: (text) => text,
  italic: (text) => text,
  strikethrough: (text) => text,
  underline: (text) => text,
};

const simpleMarkdown = (text: string, width = 80): string => {
  const md = new Markdown(text, 0, 0, plainMarkdownTheme);
  return md.render(width).join("\n");
};

const formatNotification = (text: string | null): { title: string; body: string } => {
  const simplified = text ? simpleMarkdown(text) : "";
  const normalized = simplified.replace(/\s+/g, " ").trim();
  if (!normalized) return { title: "Ready for input", body: "" };
  const maxBody = 200;
  const body = normalized.length > maxBody ? `${normalized.slice(0, maxBody - 1)}…` : normalized;
  return { title: "π", body };
};

// ── /notifications command ────────────────────────────────────────────

const SUBCOMMANDS: AutocompleteItem[] = [
  { value: "on", label: "on" },
  { value: "off", label: "off" },
  { value: "status", label: "status" },
];

// ── Extension entry ──────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", async (event) => {
    if (!getExtSetting("notifications", true)) return;
    const lastText = extractLastAssistantText(event.messages ?? []);
    const { title, body } = formatNotification(lastText);
    notify(title, body);
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
      const label = (v: boolean) => (v ? "enabled" : "disabled");

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