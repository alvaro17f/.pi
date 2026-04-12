# auto-resume

Shows the built-in session selector on startup when prior sessions exist in the current working directory.

Uses pi's `SessionSelectorComponent` — the same UI as `/resume`. Supports:

- **Tab** — toggle between cwd/all sessions
- **Type** — filter sessions
- **Ctrl+D** — delete session
- **Ctrl+R** — rename session
- **Ctrl+P** — show full paths
- **Esc** — dismiss, start new session

Selecting a session resumes it automatically. Only triggers on fresh startup (`reason: "startup"`), not on `/new`, `/resume`, `/fork`, etc.

## Install

Add to `extensionPaths` in settings.json, or place in `~/.pi/agent/extensions/auto-resume/`.