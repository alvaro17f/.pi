# .pi — Pi Coding Agent Configuration

User extensions, skills, and settings for [pi](https://github.com/mariozechner/pi-coding-agent).

## Extensions

| Extension | Description | Commands |
|-----------|-------------|----------|
| [caveman](agent/extensions/caveman/) | Token-saving output compression (~75% fewer tokens) | `/caveman [lite\|full\|ultra\|off\|status]` |
| [custom-footer](agent/extensions/custom-footer/) | TUI footer with token stats, context %, TPS, query time, git branch | — |
| [notifications](agent/extensions/notifications/) | Desktop notifications via OSC 99/777 when agent finishes a turn | `/notifications [on|off|status]` |
| [quit](agent/extensions/quit/) | Double-press Ctrl+C to quit when idle | — |
| [safe-guard](agent/extensions/safe-guard/) | Blocks/confirms dangerous bash commands and writes to sensitive paths | `/safe [on\|off\|status]` |
| [suppress-ollama-logs](agent/extensions/suppress-ollama-logs/) | Permanently filters `[pi-ollama]`-prefixed console output | — |
| [extension-settings](agent/extensions/extension-settings/) | Shared utility module for persisting extension state in settings.json | — |

## Skills

| Skill | Description |
|-------|-------------|
| [caveman](agent/skills/caveman/) | Ultra-compressed communication mode — speak like caveman, keep technical accuracy |

## Settings

State is persisted in [`settings.json`](agent/settings.json) under the `extensions` key:

- `extensionSettings.caveman` — current caveman level (`off` / `lite` / `full` / `ultra`)
- `extensionSettings.safeGuard` — safe-guard enabled (`true` / `false`)
- `extensionSettings.notifications` — desktop notifications enabled (`true` / `false`)

## Repository

[github.com/alvaro17f/.pi](https://github.com/alvaro17f/.pi)
