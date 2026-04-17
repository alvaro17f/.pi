# .pi — Pi Coding Agent Configuration

User extensions, skills, and settings for [pi](https://github.com/badlogic/pi-mono).

## Extensions

| Extension | Description | Commands |
|-----------|-------------|----------|
| [caveman](agent/extensions/caveman/) | Token-saving output compression (~75% fewer tokens). 4 levels: lite, full, ultra, off. | `/caveman [lite\|full\|ultra\|off\|status]` |
| [custom-footer](agent/extensions/custom-footer/) | TUI footer: model, token stats, context %, elapsed, CWD, git branch, TPS, query time | — |
| [notifications](agent/extensions/notifications/) | Desktop notifications via OSC 777 when agent finishes. Shows response snippet as body. | `/notifications [on\|off\|status]` |
| [ollama](agent/extensions/ollama/) | Local Ollama + Ollama Cloud provider + `ollama_web_search` / `ollama_web_fetch` tools | `/ollama [status\|sync]` |
| [pi-tool-display](agent/extensions/pi-tool-display/) | Enhanced tool output display: diffs, previews, collapsible output | — |
| [quit](agent/extensions/quit/) | Double-press `app.clear` key (Ctrl+C) to quit when idle | — |
| [safe-guard](agent/extensions/safe-guard/) | Blocks/confirms dangerous bash commands and writes to sensitive paths | `/safe [on\|off\|status]` |
| [extension-settings](agent/utils/extension-settings/) | Shared utility module for persisting extension state in `settings.json` | — |

## Skills

| Skill | Description |
|-------|-------------|
| [caveman](agent/skills/caveman/) | Ultra-compressed communication mode — speak like caveman, keep technical accuracy |

## Settings

### General

| Key | Type | Default | Current | Description |
|-----|------|---------|---------|-------------|
| `defaultProvider` | `string` | — | `ollama-cloud` | Default model provider |
| `defaultModel` | `string` | — | `glm-5.1` | Default model ID |
| `theme` | `string` | — | `catppuccin-mocha` | TUI theme |
| `quietStartup` | `boolean` | `false` | `true` | Suppress startup messages |
| `hideThinkingBlock` | `boolean` | `false` | `false` | Hide thinking blocks in output |
| `defaultThinkingLevel` | `string` | `medium` | `medium` | Default thinking level |
| `enableInstallTelemetry` | `boolean` | `true` | `false` | Telemetry on package install |

### Packages

Installed from [`settings.json`](agent/settings.json) `packages` array:

| Package | Source |
|---------|--------|
| `@ahkohd/oyo` | npm |
| `@ahkohd/pi-oyo` | npm |
| `@getpaseo/cli` | npm |
| `@ifi/pi-plan` | npm |
| `@tintinweb/pi-subagents` | npm |
| `pi-secret-guard` | npm |
| `condensed-milk-pi` | git:github.com/tomooshi |

### Extension settings

Persisted in [`settings.json`](agent/settings.json) under `extensionSettings`:

| Key | Type | Default | Current | Description |
|-----|------|---------|---------|-------------|
| `caveman` | `"off" \| "lite" \| "full" \| "ultra"` | `"off"` | `ultra` | Caveman compression level |
| `safeGuard` | `boolean` | `true` | `false` | Safe-guard enabled |
| `notifications` | `boolean` | `true` | `true` | Desktop notifications enabled |

