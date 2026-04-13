# diffloop-settings

Persists diffloop's enabled state in `settings.json` under `extensions.diffloop`.

Diffloop doesn't persist its own state — it defaults to enabled on every startup. This extension:

- Restores the saved state on startup by auto-executing `/diffloop off` if needed
- Persists state changes when the user runs `/diffloop on|off|toggle`

No commands — activates automatically on session start.