# suppress-ollama-logs

Permanently filters `[pi-ollama]`-prefixed console output.

Wraps `console.log/debug/warn/error` with a stable filter that drops any message starting with `[pi-ollama]`. The wrapper is never replaced, so other extensions can safely patch console methods on top without this filter being clobbered.

No commands — activates automatically on extension load.