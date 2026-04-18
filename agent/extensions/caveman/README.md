# caveman

Token-saving output compression. Reduces agent response tokens ~75% by stripping filler while keeping full technical accuracy.

Inspired by [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).

## Commands

| Command | Description |
|---------|-------------|
| `/caveman` | Toggle on/off (defaults to full when enabling) |
| `/caveman lite` | Drop filler words, keep grammar |
| `/caveman full` | Drop articles, fragments OK |
| `/caveman ultra` | Maximum compression, telegraphic |
| `/caveman off` | Disable |
| `/caveman status` | Show current level + `settings.json` value |

## Natural language triggers

Phrases in chat that also toggle caveman mode:

- `"caveman mode"`, `"talk like caveman"`, `"use caveman"`, `"less tokens"`, `"be brief"`, `"fewer tokens"` → activate (defaults to **full**; append `lite` or `ultra` for other levels)
- `"stop caveman"`, `"caveman off"`, `"normal mode"` → deactivate

## Levels

| Level | Effect | Example |
|-------|--------|---------|
| **Lite** | Drops filler ("just", "really", "basically", etc.). Keeps grammar. | "Your component re-renders because you create a new object reference each render. Wrap it in useMemo." |
| **Full** | Drops articles, filler, pleasantries. Short synonyms. Fragments OK. | "New object ref each render. Inline object prop = new ref = re-render. Wrap in useMemo." |
| **Ultra** | Maximum compression. Telegraphic. Almost everything dropped. | "Inline obj prop → new ref → re-render. useMemo." |

## How it works

On every `before_agent_start`, if caveman is active, injects a hidden user message with the instruction prompt for the current level. The instruction is prefixed with `CAVEMAN MODE:` and not displayed to the user.

## Persistence

Level persisted as `extensionSettings.caveman` in `settings.json` and restored on startup.