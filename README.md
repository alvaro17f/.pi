# .pi — Pi Coding Agent Configuration

User extensions, skills, and settings for [pi](https://github.com/mariozechner/pi-coding-agent).

## Extensions

| Extension | Description | Commands |
|-----------|-------------|----------|
| [auto-resume](agent/extensions/auto-resume/) | Shows session selector on startup when prior sessions exist in cwd | `/resume-selected` (internal) |
| [caveman](agent/extensions/caveman/) | Token-saving output compression (~75% fewer tokens) | `/caveman [lite\|full\|ultra\|off\|status]` |
| [custom-footer](agent/extensions/custom-footer/) | TUI footer with token stats, context %, TPS, query time, git branch | — |
| [git-guard](agent/extensions/git-guard/) | Git safety — dirty repo warning, per-turn stash checkpoints, desktop notifications | — |
| [quit](agent/extensions/quit/) | Double-press Ctrl+C to quit when idle | — |
| [safe-guard](agent/extensions/safe-guard/) | Blocks/confirms dangerous bash commands and writes to sensitive paths | `/safe [on\|off\|status]` |
| [suppress-ollama-logs](agent/extensions/suppress-ollama-logs/) | Permanently filters `[pi-ollama]`-prefixed console output | — |

## Skills

| Skill | Description |
|-------|-------------|
| [caveman](agent/skills/caveman/) | Ultra-compressed communication mode — speak like caveman, keep technical accuracy |

## Settings

State is persisted in [`settings.json`](agent/settings.json):

- `caveman` — current caveman level (`off` / `lite` / `full` / `ultra`)
- `safeGuard` — safe-guard enabled (`true` / `false`)

## Repository

[github.com/alvaro17f/.pi](https://github.com/alvaro17f/.pi)