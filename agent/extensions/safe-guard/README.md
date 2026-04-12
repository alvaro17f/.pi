# safe-guard

Two-layer protection for dangerous operations.

## Commands

| Command | Description |
|---------|-------------|
| `/safe` | Toggle on/off |
| `/safe on` | Enable |
| `/safe off` | Disable |
| `/safe status` | Show current state + settings.json value |

## Protection layers

### Command guard

Intercepts bash commands matching dangerous patterns:

- `rm -rf`, `rm --force`
- `sudo rm`
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM`
- `chmod 777`
- `mkfs`
- `dd if=`
- Redirects to `/dev/sd*`

In interactive mode: prompts for confirmation. In headless mode: outright blocks.

### Path guard

Blocks writes to protected paths:

`.env`, `.git/`, `node_modules/`, `.pi/`, `id_rsa`, `.ssh/`

In interactive mode: prompts for confirmation. In headless mode: outright blocks.

## Persistence

State is persisted as `safeGuard` in `settings.json` and restored on startup.