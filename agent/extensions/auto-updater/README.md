# auto-updater

Auto-pull git updates on startup. Fastest update path.

## How it works

1. On session start, finds the git root of the pi installation.
2. Fetches from origin in background.
3. If there are updates, pulls with `--ff-only`.
4. Shows notification "π updated! Reloading..." and reloads after 500ms.

No commands — activates automatically on session start.
