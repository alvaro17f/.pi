import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";

const CONFIG_PATH = join(getAgentDir(), "extensions/guardrails.json");

function readConfig(): { enabled: boolean } {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function toggleEnabled(): boolean {
  const config = readConfig();
  config.enabled = !config.enabled;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  return config.enabled;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("guardrails", {
    description: "Toggle guardrails on/off",
    handler: async (_args, ctx) => {
      const newState = toggleEnabled();
      ctx.ui.notify(
        `Guardrails ${newState ? "enabled" : "disabled"}`,
        newState ? "success" : "warn"
      );
    },
  });
}