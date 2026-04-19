/**
 * Caveman Extension for Pi Coding Agent
 *
 * /caveman       — show status
 * /caveman lite  — drop filler, keep grammar
 * /caveman full  — drop articles, fragments ok
 * /caveman ultra — maximum compression, telegraphic
 * /caveman off   — disable
 *
 * State persisted in settings.json under extensions.caveman.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getExtSetting, setExtSetting } from "../../utils/extension-settings/index.js";

type CavemanLevel = "off" | "lite" | "full" | "ultra";

const VALID_LEVELS: readonly CavemanLevel[] = ["off", "lite", "full", "ultra"];
const IS_VALID_LEVEL = (level: string): level is CavemanLevel => VALID_LEVELS.includes(level as CavemanLevel);

const INSTRUCTIONS: Record<CavemanLevel, string> = {
  off: "Stop caveman compression. Respond normal, full sentences, no compression.",
  lite: "Keep grammar. Drop filler words like just, really, basically, actually, simply. Remove pleasantries like sure, certainly, of course, happy to. Professional but no fluff.",
  full: "Drop articles (a, an, the). Drop filler (just, really, basically, actually, simply). Drop pleasantries (sure, certainly, of course). Short synonyms (big not extensive, fix not implement a solution for). No hedging. Fragments fine. Technical terms stay exact. Code blocks unchanged. Pattern: thing action reason. next step.",
  ultra: "Maximum compression. Telegraphic. Drop almost everything. Technical terms exact. Example: Inline obj prop → new ref → re-render. useMemo.",
};

const LEVEL_MESSAGES: Record<CavemanLevel, string> = {
  off: "Normal mode. Caveman go away.",
  lite: "Caveman Lite active. Drop filler, keep grammar.",
  full: "Caveman mode active. Drop articles, fragments ok.",
  ultra: "Caveman Ultra active. Maximum compression.",
};

const TRIGGERS = [
  "caveman mode",
  "talk like caveman",
  "use caveman",
  "less tokens",
  "be brief",
  "fewer tokens",
] as const;

const STOP_TRIGGERS = ["stop caveman", "caveman off", "normal mode", "normal 说话"] as const;

const LEVEL_OPTIONS = VALID_LEVELS.map((value) => ({ value, label: value }));

const getStoredLevel = (): CavemanLevel => {
  const stored = getExtSetting("caveman", "off");
  return IS_VALID_LEVEL(stored) ? stored : "off";
};

const persistLevel = (level: CavemanLevel): void => setExtSetting("caveman", level);

const formatLevel = (level: CavemanLevel): string => LEVEL_MESSAGES[level];

const detectCavemanTrigger = (text: string): { level: CavemanLevel; stopped: boolean } | null => {
  const lower = text.toLowerCase();

  // Check stop triggers first (before regular triggers) to handle "caveman off" correctly
  const isStopTrigger = STOP_TRIGGERS.some((stop) => lower.includes(stop));
  if (isStopTrigger) {
    return { level: "off", stopped: true };
  }

  const isTrigger = TRIGGERS.some((trigger) => lower.includes(trigger));
  if (isTrigger) {
    const level: CavemanLevel = lower.includes("ultra") ? "ultra" : lower.includes("lite") ? "lite" : "full";
    return { level, stopped: false };
  }

  return null;
};

const parseLevelArg = (arg: string): CavemanLevel | null => {
  const cleanArg = arg.split(/\s+/)[0]!.toLowerCase();
  return IS_VALID_LEVEL(cleanArg) ? cleanArg : null;
};

export default function (pi: ExtensionAPI): void {
  const currentLevel = { value: getStoredLevel() };

  pi.registerCommand("caveman", {
    description: "Caveman mode - set level: lite, full, ultra, off",
    getArgumentCompletions: (prefix) => LEVEL_OPTIONS.filter((o) => o.value.startsWith(prefix)),
    handler: async (args, ctx) => {
      const levelArg = args?.trim().toLowerCase() ?? "";
      const parsedLevel = levelArg ? parseLevelArg(levelArg) : null;

      if (parsedLevel !== null) {
        currentLevel.value = parsedLevel;
        persistLevel(currentLevel.value);
        ctx.ui.notify(formatLevel(currentLevel.value), "info");
      } else {
        ctx.ui.notify(`caveman: ${currentLevel.value}`, "info");
      }
    },
  });

  pi.on("before_agent_start", async (_event, _ctx) => {
    const instruction = INSTRUCTIONS[currentLevel.value];
    if (!instruction) return;

    return {
      message: { role: "user" as const, content: [{ type: "text" as const, text: `CAVEMAN MODE ${currentLevel.value.toUpperCase()}: ${instruction}` }], display: false },
    };
  });

  pi.on("input", async (event, ctx) => {
    const result = detectCavemanTrigger(event.text);
    if (result) {
      currentLevel.value = result.level;
      persistLevel(currentLevel.value);
      ctx.ui.notify(formatLevel(currentLevel.value), "info");
    }
  });
}

export { formatLevel, detectCavemanTrigger, INSTRUCTIONS };
