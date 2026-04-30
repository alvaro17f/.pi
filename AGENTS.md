# AGENTS.md

Project-level conventions for the Pi user config repository at `~/.pi`.

The global `agent/AGENTS.md` handles general coding behavior and context-mode routing rules. This file covers `.pi`-specific conventions: TypeScript patterns, documentation updates, JSON config editing, extension/skill authoring, and git awareness.

## TypeScript standards

Extensions live in `agent/extensions/<name>/index.ts`. Follow these rules:

- **`const` only** — never use `let` unless reassignment is unavoidable
- **Arrow functions** over `function` keyword
- **Explicit return types** on exported functions
- **Minimize allocations** — prefer mutation-free but allocation-aware code
- **Clean code** — single responsibility, short functions, descriptive names

Codebase already follows these patterns. Maintain consistency.

## Documentation

When creating, modifying, or removing extensions, skills, utilities, or config entries, always update these README files:

| Path | Purpose |
|------|---------|
| `README.md` | Main project overview |
| `agent/extensions/<name>/README.md` | Per-extension docs |
| `agent/utils/<name>/README.md` | Per-utility docs |
| `agent/skills/<name>/SKILL.md` | Skill docs |

- Preserve existing table formats, section headings, and markdown style
- Don't restructure or reformat existing content
- Don't change conventions mid-file

## JSON config editing

Config files: `agent/settings.json`, `agent/keybindings.json`, `agent/mcp.json`, `agent/models.json`.

- **Preserve key order** — don't reorder existing keys
- **2-space indent**, no trailing commas
- **Validate JSON** after edits — broken config kills Pi startup

## Extensions, skills, and agents

Extension detection:
- **Has `index.ts`** → real extension. Must include `README.md`. Follow TypeScript standards above.
- **No `index.ts`** (e.g., only `config.json`) → config-only directory, not an extension. Don't delete. Don't require README.

Rules:
- Extensions: `agent/extensions/<name>/index.ts` — match existing patterns
- Skills: `agent/skills/<name>/SKILL.md` — follow existing format
- Custom agents: `agent/agents/<name>.md`
- No npm dependencies without explicit request

## Git awareness

`.gitignore` uses negation — everything ignored except specific whitelisted paths:

- `!agent/` subtree
- `!README.md` and related docs

**New files outside tracked paths won't commit.** Warn user when creating files in untracked directories.
