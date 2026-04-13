# suppress-tau-logs

Permanently filters `[Mirror]`-prefixed console output from the pi-tau extension.

Wraps `console.log/debug/warn/error` with a stable filter that drops any message starting with `[Mirror]`. The wrapper is never replaced, so other extensions can safely patch console methods on top.

No commands — activates automatically on extension load.