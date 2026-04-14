# notifications

Desktop notifications when the agent finishes a turn. Uses OSC 99 (Kitty) or OSC 777 (iTerm2, foot, WezTerm).

## Commands

| Command | Description |
|---------|-------------|
| `/notifications` | Toggle notifications on/off |
| `/notifications on` | Enable notifications |
| `/notifications off` | Disable notifications |
| `/notifications status` | Show current state |

Default: enabled. State persisted in `extensionSettings.notifications` in `settings.json`.