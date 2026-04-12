# quit

Double-press-to-quit extension for pi coding agent.

Double-press `Ctrl+C` (or your clear keybinding) on empty editor + idle state to quit.

## Behavior

- Editor empty + idle → first press shows "Ctrl+C again to quit"
- Second press within 500ms → quits pi
- Any other key → clears hint, normal behavior
- Editor not empty → clears editor first

## Install

```bash
pi install git:github.com/alvaro17f/pi
```
