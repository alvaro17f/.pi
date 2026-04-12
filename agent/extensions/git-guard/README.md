# git-guard

Git safety net for pi sessions.

## Features

- **Dirty repo warning** — on session start, warns if there are uncommitted changes
- **Per-turn stash checkpoints** — creates a `git stash create` checkpoint before each agent turn, so you can roll back if the agent makes unwanted changes
- **Desktop notifications** — sends terminal notification (OSC 99 for Kitty, OSC 777 for others) when the agent finishes a turn. Skipped in headless/pipe mode.

No commands — activates automatically on session start.