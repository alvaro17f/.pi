# custom-footer

Custom TUI status bar with real-time session stats. Replaces the default footer on session start.

## Displayed info

| Segment | Description |
|---------|-------------|
| `◆ provider/model` | Current model + thinking level indicator (◆ color: high=warning, medium=accent, low=dim, off=muted) |
| `in/out ctx%` | Token counts (input/output) + context window usage % (color: >75%=error, >50%=warning, else=success) |
| `⏱ elapsed` | Time since session start (auto-updates every 30s) |
| `⌂ cwd` | Last 2 segments of working directory |
| `⎇ branch` | Current git branch (if any) |
| `tok/s` | Output tokens per second from last agent turn |
| `query time` | Wall-clock duration of last agent turn |

## Events tracked

- `session_start` / `session_switch` — resets counters, installs footer
- `agent_start` / `agent_end` — tracks TPS + query duration
- `turn_end` — accumulates token usage
- `session_tree` / `session_fork` — recalculates totals

No commands — activates automatically on session start.