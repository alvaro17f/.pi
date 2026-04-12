# caveman

Token-saving output compression. Reduces agent response tokens ~75% by speaking like a caveman while keeping full technical accuracy.

Inspired by [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).

## Commands

| Command | Description |
|---------|-------------|
| `/caveman` | Toggle on/off (defaults to full) |
| `/caveman lite` | Drop filler, keep grammar |
| `/caveman full` | Drop articles, fragments ok |
| `/caveman ultra` | Maximum compression, telegraphic |
| `/caveman off` | Disable |
| `/caveman status` | Show current level + settings.json value |

## Natural language triggers

These phrases in chat also toggle caveman:

- "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", "fewer tokens" → activate
- "stop caveman", "normal mode" → deactivate

## Levels

| Level | Example |
|-------|---------|
| **Lite** | "Your component re-renders because you create a new object reference each render. Wrap it in useMemo." |
| **Full** | "New object ref each render. Inline object prop = new ref = re-render. Wrap in useMemo." |
| **Ultra** | "Inline obj prop → new ref → re-render. useMemo." |

## Persistence

Level is persisted as `caveman` in `settings.json` and restored on startup.