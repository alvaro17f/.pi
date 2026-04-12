# suppress-ollama-logs

Suppresses pi-ollama startup log noise by filtering `[pi-ollama]`-prefixed console output for 10 seconds after load.

Monkey-patches `console.log/debug/warn/error` to drop matching messages, then auto-restores the originals.

No commands — activates automatically on extension load.