# Ollama Extension for Pi

Local Ollama + Ollama Cloud + Web Tools — all in one.

- No local server required for cloud features (models, web search, web fetch)
- Auto-discovers local models when Ollama is running
- Dynamic cloud model discovery with persistent cache
- Built-in `ollama_web_search` and `ollama_web_fetch` tools

## Setup

### Cloud (recommended)

1. Get an API key from [ollama.com](https://ollama.com)
2. Set the environment variable:

   ```bash
   export OLLAMA_API_KEY="your-key"
   ```

   Or add to `~/.pi/agent/auth.json`:

   ```json
   { "ollama-cloud": { "type": "api_key", "key": "your-key" } }
   ```

3. Run `/ollama update` to fetch cloud models

### Local

Just have [Ollama](https://ollama.com) running on `localhost:11434`. The extension auto-detects it on startup.

Custom URL via `OLLAMA_HOST` env var:

```bash
export OLLAMA_HOST="http://192.168.1.50:11434"
```

## Commands

| Command | Description |
| --- | --- |
| `/ollama status` | Show connection status (local + cloud) |
| `/ollama update` | Refresh model list (local + cloud) |

## Tools

| Tool | Description |
| --- | --- |
| `ollama_web_search` | Search the web via Ollama Cloud |
| `ollama_web_fetch` | Fetch a web page via Ollama Cloud |

Both tools use the same `OLLAMA_API_KEY`. No local server needed.

## Providers

| Provider | Endpoint | Models |
| --- | --- | --- |
| `ollama` | `localhost:11434/v1` | All local models |
| `ollama-cloud` | `ollama.com/v1` | Cloud models with `tools` capability |

Switch with `/model` or `Ctrl+L`.

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_API_KEY` | — | Cloud API key (required for cloud) |
| `OLLAMA_HOST` | `http://localhost:11434` | Local Ollama URL |
| `OLLAMA_API_BASE` | `https://ollama.com` | Cloud base URL |

## How It Works

### Local

On startup, checks if Ollama is running on `localhost:11434` (or `OLLAMA_HOST`).
If reachable, fetches `/api/tags` (model list) + `/api/show` (details per model)
and registers them under the `ollama` provider.

### Cloud

On startup, reads cached model data from `~/.pi/agent/cache/ollama-cloud-models.json`.
If no cache exists, registers a small set of fallback models.
Run `/ollama update` to fetch the full model catalog from `ollama.com/v1/models` + `/api/show`
and cache it locally. Only models with the `tools` capability are registered.

### Web Tools

`ollama_web_search` and `ollama_web_fetch` call Ollama Cloud's `/api/web_search`
and `/api/web_fetch` endpoints directly. Same API key, no local server needed.