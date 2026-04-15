# safe-guard

Two-layer protection for dangerous operations.

## Commands

| Command | Description |
|---------|-------------|
| `/safe` | Toggle on/off |
| `/safe on` | Enable |
| `/safe off` | Disable |
| `/safe status` | Show current state + `settings.json` value |

Default: enabled. State persisted as `extensionSettings.safeGuard` in `settings.json`.

## Layer 1: Command guard

Intercepts `bash` tool calls matching dangerous patterns:

| Pattern | Examples |
|---------|---------|
| `rm -f` / `rm -rf` | `rm -rf /tmp/old`, `rm -fR build/` |
| `rm --force` | `rm --force logfile` |
| `sudo rm` | `sudo rm -rf /opt/old` |
| `DROP TABLE` / `TRUNCATE` / `DELETE FROM` | SQL destructive statements |
| `chmod 777` | `chmod 777 /var/data` |
| `mkfs` | `mkfs.ext4 /dev/sda1` |
| `dd if=` | `dd if=/dev/zero of=/dev/sda` |
| Redirect to `/dev/sd*` | `something > /dev/sda` |

**Interactive mode**: prompts for confirmation.
**Headless mode**: outright blocks.

## Layer 2: Path guard

Blocks `write` and `edit` tool calls to protected paths:

| Protected path | Matches | Does not match |
|---------------|---------|----------------|
| `.env` | `.env`, `foo/.env` | `.envrc`, `.env.local` |
| `.git/` | `.git/config`, `foo/.git/HEAD` | `my.git/` |
| `node_modules/` | `node_modules/pkg/index.js` | `node_modules_backup/` |
| `.pi/` | `.pi/settings.json` | `.pip/` |
| `id_rsa` | `id_rsa`, `ssh/id_rsa` | `id_rsa_backup` |
| `.ssh/` | `.ssh/config`, `foo/.ssh/known_hosts` | `my.ssh/` |

Path matching is **separator-aware** — only matches exact names bounded by `/` or string start/end.

**Interactive mode**: prompts for confirmation.
**Headless mode**: outright blocks.