# .pi — Pi Coding Agent Configuration

User extensions, skills, and settings for [pi](https://github.com/badlogic/pi-mono).

## Extensions

| Extension | Description | Commands |
|-----------|-------------|----------|
| [caveman](agent/extensions/caveman/) | Token-saving output compression (~75% fewer tokens). 4 levels: lite, full, ultra, off. | `/caveman [lite\|full\|ultra\|off\|status]` |
| [custom-footer](agent/extensions/custom-footer/) | TUI footer: model, token stats, context %, elapsed, CWD, git branch, TPS, query time | — |
| [notifications](agent/extensions/notifications/) | Desktop notifications via OSC 777 when agent finishes. Shows response snippet as body. | `/notifications [on\|off\|status]` |
| [ollama](agent/extensions/ollama/) | Local Ollama + Ollama Cloud provider + `ollama_web_search` / `ollama_web_fetch` tools | `/ollama [status\|sync]` |
| [ui](agent/extensions/ui/) | Pi Pane — custom TUI layout with pane editor, message patches, startup header | — |
| [pi-rtk-optimizer](agent/extensions/pi-rtk-optimizer/) | RTK source filtering and output compaction (~90% context reduction) | — |
| [pi-tool-display](agent/extensions/pi-tool-display/) | Enhanced tool output display: diffs, previews, collapsible output | — |
| [extension-settings](agent/utils/extension-settings/) | Shared utility module for persisting extension state in `settings.json` | — |

## Packages

Installed from [`settings.json`](agent/settings.json) `packages` array:

| Package | Source |
|---------|--------|
| `@ahkohd/oyo` | npm |
| `@ahkohd/pi-oyo` | npm |
| `@getpaseo/cli` | npm |
| `@ifi/pi-plan` | npm |
| `@lpirito/pi-diffloop` | npm |
| `@sting8k/pi-vcc` | npm |
| `@tintinweb/pi-subagents` | npm |
| `context-mode` | npm |
| `pi-ask-mode` | npm |
| `pi-btw` | npm |
| `pi-image-preview` | npm |
| `pi-mcp-adapter` | npm |
| `pi-rtk-optimizer` | npm |
| `pi-secret-guard` | npm |
| `pi-tool-display` | npm |

## Skills

| Skill | Description |
|-------|-------------|
| [caveman](agent/skills/caveman/) | Ultra-compressed communication mode — speak like caveman, keep technical accuracy |
| [conventional-commit](agent/skills/conventional-commit/) | Structured XML format for standardized commit messages |
| [find-skills](agent/skills/find-skills/) | Discover and install agent skills |
| [semver-release](agent/skills/semver-release/) | Semantic versioning and release management |
| [tdd](agent/skills/tdd/) | Test-driven development with red-green-refactor loop |

## Settings

### General

| Key | Type | Default | Current | Description |
|-----|------|---------|---------|-------------|
| `defaultProvider` | `string` | — | `ollama-cloud` | Default model provider |
| `defaultModel` | `string` | — | `deepseek-v4-pro` | Default model ID |
| `theme` | `string` | — | `catppuccin-mocha` | TUI theme |
| `quietStartup` | `boolean` | `false` | `false` | Suppress startup messages |
| `hideThinkingBlock` | `boolean` | `false` | `false` | Hide thinking blocks in output |
| `defaultThinkingLevel` | `string` | `medium` | `medium` | Default thinking level |
| `enableInstallTelemetry` | `boolean` | `true` | `false` | Telemetry on package install |

### Extension settings

Persisted in [`settings.json`](agent/settings.json) under `extensionSettings`:

| Key | Type | Default | Current | Description |
|-----|------|---------|---------|-------------|
| `caveman` | `"off" \| "lite" \| "full" \| "ultra"` | `"off"` | `full` | Caveman compression level |
| `notifications` | `boolean` | `true` | `true` | Desktop notifications enabled |