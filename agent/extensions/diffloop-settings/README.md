# diffloop-settings

Persists diffloop enabled state across restarts via the `/dls` command.

Diffloop doesn't persist its own state. pi skips the `input` event for extension commands, so we can't detect `/diffloop` usage directly. Instead, `/dls` acts as a proxy:

- `/dls on` — enable diffloop + persist
- `/dls off` — disable diffloop + persist
- `/dls toggle` — toggle diffloop + persist
- `/dls status` — show saved state

On startup, if saved state is `false`, auto-executes `/diffloop off`.

State stored in `settings.json` under `extensionSettings.diffloop`.