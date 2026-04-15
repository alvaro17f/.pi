# quit

Double-press Ctrl+C (or your `app.clear` key) to quit pi when idle.

## Behavior

| Condition | First press | Second press (within 500ms) |
|-----------|-------------|-----------------------------|
| Editor has text | Clears editor + starts quit window | — (editor was just cleared, now empty) |
| Editor empty, agent idle | Starts quit window, shows hint | Calls `shutdown()` — quits |
| Editor empty, agent busy | Normal key handling | Normal key handling |

The hint message (e.g. `Ctrl+C again to quit`) appears inline in the editor and auto-dismisses after 500ms.

No commands — replaces the editor component with `QuitAwareEditor` on session start (UI mode only).