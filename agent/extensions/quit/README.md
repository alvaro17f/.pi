# quit

Double-press Ctrl+C to quit pi when idle.

- First press clears the editor and shows hint: "Ctrl+C again to quit"
- Second press within 500ms calls `shutdown()`
- Only active when the agent is idle and the editor is empty

No commands — replaces the editor with a `QuitAwareEditor` on session start.