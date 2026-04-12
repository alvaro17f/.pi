# caveman

Caveman mode extension + skill for Pi coding agent.

Cuts ~75% of output tokens while keeping full technical accuracy.

## Modes

| Level | Description |
|-------|-------------|
| `lite` | Drop filler, keep grammar |
| `full` | Drop articles, fragments ok |
| `ultra` | Maximum compression, telegraphic |

## Usage

```
/caveman        # Toggle on/off (defaults to full)
/caveman lite   # Lite mode
/caveman full    # Default caveman
/caveman ultra   # Ultra compression
/caveman off     # Disable
```

Auto-triggers on: "caveman mode", "talk like caveman", "less tokens", "be brief".

## Install

Add to your `settings.json` packages or install via:

```bash
pi install git:github.com/alvaro17f/pi
```