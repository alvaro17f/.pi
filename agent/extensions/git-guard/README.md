# git-guard

Git safety features for pi coding agent.

## Features

- **Dirty repo warning** — notifies at session start if there are uncommitted changes
- **Turn checkpoints** — creates a git stash snapshot before each agent turn
- **Terminal notification** — sends desktop/terminal notification when agent finishes

Supports Kitty (OSC 99) and generic terminal (OSC 777) notification protocols.

## Install

```bash
pi install git:github.com/alvaro17f/pi
```