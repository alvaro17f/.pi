/**
 * Extension Settings — centralized persistence for extension state in settings.json.
 *
 * All extension settings are stored under the "extensions" key:
 *
 *   "extensions": {
 *     "safeGuard": false,
 *     "caveman": "ultra",
 *     "diffloop": true
 *   }
 *
 * Other extensions import `loadExtSettings` / `saveExtSettings` to read/write their state.
 */

import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

const settingsPath = getAgentDir() + "/settings.json";

export interface ExtSettings {
  [key: string]: unknown;
}

function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

/** Load the extensionSettings sub-object from settings.json. */
export function loadExtSettings(): ExtSettings {
  const settings = readSettings();
  return (settings.extensionSettings as ExtSettings) ?? {};
}

/** Save the extensionSettings sub-object to settings.json. */
export function saveExtSettings(ext: ExtSettings): void {
  const settings = readSettings();
  settings.extensionSettings = ext;
  writeSettings(settings);
}

/** Get a single extension setting. */
export function getExtSetting(key: string, defaultValue: unknown): unknown {
  const ext = loadExtSettings();
  return ext[key] ?? defaultValue;
}

/** Set a single extension setting. */
export function setExtSetting(key: string, value: unknown): void {
  const ext = loadExtSettings();
  ext[key] = value;
  saveExtSettings(ext);
}