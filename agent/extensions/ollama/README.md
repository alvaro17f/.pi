# ollama

Local Ollama + Ollama Cloud + Web Tools — all in one extension.

- **No local server required** for cloud features (models, web search, web fetch)
- Auto-discovers local models on startup
- Dynamic cloud model discovery with persistent JSON cache
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

3. Run `/ollama update` to fetch the cloud model catalog

### Local

Just have [Ollama](https://ollama.com) running on `localhost:11434`. The extension auto-detects it on startup.

Custom URL via `OLLAMA_HOST` env var:

```bash
export OLLAMA_HOST="http://192.168.1.50:11434"
```

## Commands

| Command | Description |
|---------|-------------|
| `/ollama status` | Show connection status (local + cloud) |
| `/ollama update` | Refresh model list (local + cloud) |

## Tools

| Tool | Description |
|------|-------------|
| `ollama_web_search` | Search the web via Ollama Cloud. Params: `query` (string), `max_results` (1–10, default 5) |
| `ollama_web_fetch` | Fetch and extract text from a URL via Ollama Cloud. Params: `url` (string) |

Both tools require `OLLAMA_API_KEY`. No local server needed.

Tool results are rendered with truncation (8 preview lines) and expandable via `app.tools.expand`.

## Providers

| Provider | Endpoint | Models |
|----------|----------|--------|
| `ollama` | `localhost:11434/v1` | All local models (auto-discovered) |
| `ollama-cloud` | `ollama.com/v1` | Cloud models with `tools` capability |

Switch with `/model` or `Ctrl+L`.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OLLAMA_API_KEY` | — | Cloud API key (required for cloud + web tools) |
| `OLLAMA_HOST` | `http://localhost:11434` | Local Ollama server URL |
| `OLLAMA_API_BASE` | `https://ollama.com` | Cloud base URL |

## How it works

### Local discovery

On startup, checks if Ollama is reachable at `OLLAMA_HOST`. If so, fetches `/api/tags` (model list) + `/api/show` per model (details, capabilities, context length) and registers them under the `ollama` provider. Context length is read from `model_info` or guessed from model name.

### Cloud discovery

On startup, reads cached model data from `~/.pi/agent/cache/ollama-cloud-models.json`. If no cache, registers a small set of fallback models. `/ollama update` fetches `/v1/models` + `/api/show` per model, filters to those with `tools` capability, and caches the result.

### Web tools

`ollama_web_search` and `ollama_web_fetch` call Ollama Cloud's `/api/web_search` and `/api/web_fetch` directly. Same API key, no local server needed. Requests have a 10s timeout with external abort signal chaining.