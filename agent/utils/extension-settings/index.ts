/**
 * Extension Settings — centralized persistence for extension state in settings.json.
 *
 * All extension settings are stored under the "extensions" key:
 *
 *   "extensions": {
 *     "<extensionName>": <value>
 *   }
 *
 * Other extensions import `loadExtSettings` / `saveExtSettings` to read/write their state.
 */

import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

const log = {
  warn: (...args: unknown[]) => console.warn("[extension-settings]", ...args),
  error: (...args: unknown[]) => console.error("[extension-settings]", ...args),
};

const settingsPath = getAgentDir() + "/settings.json";

export interface ExtSettings {
  [key: string]: unknown;
}

function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch (err) {
    log.warn("Failed to read settings.json, using empty defaults:", err);
    return {};
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  } catch (err) {
    log.error("Failed to write settings.json:", err);
  }
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
export function getExtSetting<T>(key: string, defaultValue: T): T;
export function getExtSetting(key: string, defaultValue: unknown): unknown;
export function getExtSetting<T>(key: string, defaultValue: T): T {
  const ext = loadExtSettings();
  return (ext[key] as T) ?? defaultValue;
}

/** Set a single extension setting (reads fresh, merges, writes atomically). */
export function setExtSetting(key: string, value: unknown): void {
  const settings = readSettings();
  const ext: ExtSettings = (settings.extensionSettings as ExtSettings) ?? {};
  ext[key] = value;
  settings.extensionSettings = ext;
  writeSettings(settings);
}

// No-op factory — this is a shared utility module, not an active extension.
export default function () {}