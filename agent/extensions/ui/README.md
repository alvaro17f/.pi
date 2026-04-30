# Pi Pane

Custom TUI layout extension for Pi Coding Agent. Replaces default header, input editor, and startup listing with a polished pane-based interface.

## Features

- **Pane editor** — custom `PiPaneEditor` replacing default input component
- **Header override** — custom header with model listing and session info
- **Startup patch** — animated startup listing with auto-reveal
- **Message patch** — modifies user messages to include response times
- **Visual effects** — theme-aware UI rendering utilities
- **Startup flash suppression** — suppresses built-in header flash before extensions load
- **Model scope capture** — intercepts model list from console output for header display

## Architecture

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | 159 | Extension entry: hooks, stdout suppression, header/editor registration |
| `editor.ts` | 202 | Custom `PiPaneEditor` component |
| `message.ts` | 122 | Patches user messages with response timing data |
| `startup.ts` | 603 | Animated startup listing with sections and reveal logic |
| `utils.ts` | 23 | Shared utility functions |
| `visual.ts` | 91 | Theme-aware visual rendering helpers |
