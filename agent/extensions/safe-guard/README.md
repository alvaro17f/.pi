# safe-guard

Two-layer protection for dangerous operations.

## Features

- **Command guard** — detects destructive bash patterns (`rm -rf`, `DROP TABLE`, etc.) and prompts for confirmation
- **Path guard** — blocks writes to sensitive paths (`.env`, `.git/`, `.ssh/`, etc.) with confirmation in interactive mode, outright blocking in headless mode

## Protected paths

`.env`, `.git/`, `node_modules/`, `.pi/`, `id_rsa`, `.ssh/`

## Install

```bash
pi install git:github.com/alvaro17f/pi
```