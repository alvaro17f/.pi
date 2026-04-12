/**
 * Caveman Extension for Pi Coding Agent
 *
 * Inspired by https://github.com/JuliusBrussee/caveman
 * Makes the agent speak like a caveman - cutting ~75% of output tokens
 * while keeping full technical accuracy.
 *
 * /caveman       — toggle on/off (defaults to full)
 * /caveman lite  — drop filler, keep grammar
 * /caveman full  — drop articles, fragments ok
 * /caveman ultra — maximum compression, telegraphic
 * /caveman off   — disable
 *
 * State persisted in settings.json as caveman.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

type CavemanLevel = "off" | "lite" | "full" | "ultra";

let currentLevel: CavemanLevel = "off";

export const INSTRUCTIONS: Record<CavemanLevel, string> = {
  off: "",
  lite: `Caveman Lite Mode: Keep grammar. Drop filler words like "just", "really", "basically", "actually", "simply". Remove pleasantries like "sure", "certainly", "of course", "happy to". Professional but no fluff.`,
  full: `Caveman Mode: Drop articles (a, an, the). Drop filler (just, really, basically, actually, simply). Drop pleasantries (sure, certainly, of course). Short synonyms (big not extensive, fix not "implement a solution for"). No hedging. Fragments fine. Technical terms stay exact. Code blocks unchanged. Pattern: [thing] [action] [reason]. [next step].`,
  ultra: `Caveman Ultra Mode: Maximum compression. Telegraphic. Drop almost everything. Technical terms exact. Example: "Inline obj prop → new ref → re-render. useMemo."`,
};

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

function persistLevel(level: CavemanLevel): void {
  const settings = loadSettings();
  settings.caveman = level;
  saveSettings(settings);
}

function restoreLevel(): CavemanLevel {
  const settings = loadSettings();
  const saved = settings.caveman as string | undefined;
  if (saved && ["off", "lite", "full", "ultra"].includes(saved)) {
    return saved as CavemanLevel;
  }
  return "off";
}

export function formatLevel(level: CavemanLevel): string {
  switch (level) {
    case "off": return "Normal mode. Caveman go away.";
    case "lite": return "Caveman Lite active. Drop filler, keep grammar.";
    case "full": return "Caveman mode active. Drop articles, fragments ok.";
    case "ultra": return "Caveman Ultra active. Maximum compression.";
  }
}

export function detectCavemanTrigger(text: string): { level: CavemanLevel; stopped: boolean } | null {
  const lower = text.toLowerCase();
  const triggers = [
    "caveman mode",
    "talk like caveman",
    "use caveman",
    "less tokens",
    "be brief",
    "fewer tokens",
  ];

  for (const trigger of triggers) {
    if (lower.includes(trigger)) {
      let level: CavemanLevel = "full";
      if (lower.includes("lite")) level = "lite";
      else if (lower.includes("ultra")) level = "ultra";
      return { level, stopped: false };
    }
  }

  const stopTriggers = ["stop caveman", "normal mode", "normal 说话"];
  for (const stop of stopTriggers) {
    if (lower.includes(stop)) {
      return { level: "off", stopped: true };
    }
  }

  return null;
}

export default function (pi: ExtensionAPI) {
  currentLevel = restoreLevel();

  pi.registerCommand("caveman", {
    description: "Toggle caveman mode - speak like caveman, fewer tokens",
    getArgumentCompletions: (prefix) => {
      const options = [
        { value: "lite", label: "lite" },
        { value: "full", label: "full" },
        { value: "ultra", label: "ultra" },
        { value: "off", label: "off" },
      ];
      return options.filter((o) => o.value.startsWith(prefix));
    },
    handler: async (args, ctx) => {
      const levelArg = args?.trim().toLowerCase() || "";

      if (!levelArg) {
        currentLevel = currentLevel === "off" ? "full" : "off";
      } else {
        const cleanArg = levelArg.split(/\s+/)[0].replace(/[^a-z]/g, "");
        if (["lite", "full", "ultra", "off"].includes(cleanArg)) {
          currentLevel = cleanArg as CavemanLevel;
        } else {
          ctx.ui.notify(`Unknown level: ${args}. Use lite, full, ultra, or off.`, "error");
          return;
        }
      }

      persistLevel(currentLevel);
      ctx.ui.notify(formatLevel(currentLevel), "info");
    },
  });

  pi.on("before_agent_start", async (event, ctx) => {
    if (currentLevel === "off") return;

    const instruction = INSTRUCTIONS[currentLevel];
    if (!instruction) return;

    return {
      message: {
        role: "user",
        content: [{ type: "text", text: `[CAVEMAN MODE: ${instruction}]` }],
        display: false,
      },
    };
  });

  pi.on("input", async (event, ctx) => {
    const result = detectCavemanTrigger(event.text);
    if (result) {
      currentLevel = result.level;
      persistLevel(currentLevel);
      ctx.ui.notify(formatLevel(currentLevel), "info");
    }
  });
}