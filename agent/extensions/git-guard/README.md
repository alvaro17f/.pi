# git-guard

Git safety net for pi sessions.

## Features

- **Dirty repo warning** — on session start, warns if there are uncommitted changes
- **Per-turn stash checkpoints** — creates a `git stash create` checkpoint before each agent turn. Refs are captured and stored.
- **Desktop notifications** — sends terminal notification (OSC 99 for Kitty, OSC 777 for others) when the agent finishes a turn. Skipped in headless/pipe mode.

## Commands

| Command | Description |
|---------|-------------|
| `/git-checkpoints` | List stash checkpoint refs from this session |

Restore a checkpoint with `git stash apply <ref>`.

No other commands — activates automatically on session start.