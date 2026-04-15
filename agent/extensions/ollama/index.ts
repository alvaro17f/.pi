/**
 * Ollama Extension for Pi
 *
 * Local Ollama + Ollama Cloud + Web Tools — all in one.
 * No local server required for cloud features (models, web search, web fetch).
 *
 * Commands: /ollama status | /ollama update
 * Tools:    ollama_web_search, ollama_web_fetch
 * Providers: ollama (local), ollama-cloud (cloud)
 *
 * Setup:
 *   Cloud: Set OLLAMA_API_KEY env var or add to ~/.pi/agent/auth.json:
 *          { "ollama-cloud": { "type": "api_key", "key": "your-key" } }
 *   Local: No setup needed if Ollama is running on localhost:11434.
 *          Custom URL via OLLAMA_HOST env var.
 *          Cloud base via OLLAMA_API_BASE env var (default: https://ollama.com).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  ProviderModelConfig,
} from "@mariozechner/pi-coding-agent";
import { keyHint, truncateToVisualLines } from "@mariozechner/pi-coding-agent";
import { Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

// ─── Config ───────────────────────────────────────────────────────────────────

const CACHE_DIR = join(homedir(), ".pi", "agent", "cache");
const CACHE_FILE = join(CACHE_DIR, "ollama-cloud-models.json");
const FETCH_TIMEOUT_MS = 10_000;

const LOCAL_BASE = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/+$/, "");
const CLOUD_BASE = (process.env.OLLAMA_API_BASE || "https://ollama.com").replace(/\/+$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface OllamaShowResponse {
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
  model_info: Record<string, unknown>;
  capabilities: string[];
  modified_at: string;
}

interface OllamaListModel {
  name: string;
  size?: number;
  modified_at?: string;
  details?: {
    parameter_size?: string;
    family?: string;
    families?: string[];
  };
}

interface OllamaListResponse {
  models: OllamaListModel[];
}

interface CachedData {
  timestamp: number;
  models: Record<string, OllamaShowResponse>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getContextLength(modelInfo: Record<string, unknown>): number {
  for (const [key, value] of Object.entries(modelInfo)) {
    if (key.endsWith(".context_length") && typeof value === "number") return value;
  }
  return 128000;
}

function guessContextFromName(name: string): number {
  const l = name.toLowerCase();
  if (l.includes("llama3.1") || l.includes("llama3.2") || l.includes("llama3.3")) return 128000;
  if (l.includes("llama3") || l.includes("llama4")) return 8192;
  if (l.includes("gemma3")) return 131072;
  if (l.includes("gemma2") || l.includes("gemma4")) return 8192;
  if (l.includes("mistral") || l.includes("mixtral")) return 32768;
  if (l.includes("qwen3")) return 262144;
  if (l.includes("qwen2.5")) return 32768;
  if (l.includes("qwen")) return 32768;
  if (l.includes("glm")) return 202752;
  if (l.includes("kimi")) return 262144;
  if (l.includes("codellama")) return 16384;
  if (l.includes("phi3") || l.includes("phi4")) return 128000;
  if (l.includes("deepseek-r1")) return 131072;
  if (l.includes("deepseek")) return 65536;
  if (l.includes("qwq")) return 131072;
  return 4096;
}

function isReasoningByName(name: string): boolean {
  return /\b(r1|reason|think|deepseek|qwq|coder|code)\b/i.test(name);
}

function assembleCloudModels(raw: Record<string, OllamaShowResponse>): ProviderModelConfig[] {
  return Object.entries(raw)
    .filter(([, d]) => d.capabilities?.includes("tools"))
    .map(([id, d]) => ({
      id,
      name: id,
      reasoning: d.capabilities?.includes("thinking") ?? false,
      input: (d.capabilities?.includes("vision") ? ["text", "image"] : ["text"]) as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: getContextLength(d.model_info ?? {}),
      maxTokens: 32768,
    }));
}

function assembleLocalModels(
  models: OllamaListModel[],
  details: Map<string, OllamaShowResponse | null>,
): ProviderModelConfig[] {
  return models.map((m) => {
    const show = details.get(m.name);
    const caps = show?.capabilities ?? [];
    return {
      id: m.name,
      name: m.name,
      reasoning: caps.includes("thinking") || isReasoningByName(m.name),
      input: (caps.includes("vision") ? ["text", "image"] : ["text"]) as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: show ? getContextLength(show.model_info ?? {}) : guessContextFromName(m.name),
      maxTokens: 32768,
    };
  });
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function readCache(): Record<string, OllamaShowResponse> | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const data: CachedData = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    return data.models && Object.keys(data.models).length > 0 ? data.models : null;
  } catch {
    return null;
  }
}

function writeCache(models: Record<string, OllamaShowResponse>): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), models } satisfies CachedData, null, 2));
  } catch {
    // ignore write errors
  }
}

// ─── Fetch with timeout + external signal chaining ────────────────────────────

async function fetchT(url: string, init: RequestInit = {}, timeout = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  // Chain external signal if provided (e.g. tool's AbortSignal)
  if (init.signal) {
    if (init.signal.aborted) {
      clearTimeout(timer);
      ctrl.abort();
    } else {
      init.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Local Ollama ─────────────────────────────────────────────────────────────

async function isLocalRunning(): Promise<boolean> {
  try {
    const res = await fetchT(`${LOCAL_BASE}/api/tags`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchLocalModels(): Promise<{
  models: OllamaListModel[];
  details: Map<string, OllamaShowResponse | null>;
} | null> {
  try {
    const res = await fetchT(`${LOCAL_BASE}/api/tags`);
    if (!res.ok) return null;
    const data = (await res.json()) as OllamaListResponse;
    const models = data.models ?? [];

    const details = new Map<string, OllamaShowResponse | null>();
    await Promise.allSettled(
      models.map(async (m) => {
        try {
          const r = await fetchT(`${LOCAL_BASE}/api/show`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: m.name }),
          });
          details.set(m.name, r.ok ? ((await r.json()) as OllamaShowResponse) : null);
        } catch {
          details.set(m.name, null);
        }
      }),
    );

    return { models, details };
  } catch {
    return null;
  }
}

// ─── Ollama Cloud ─────────────────────────────────────────────────────────────

const FALLBACK_MODELS: ProviderModelConfig[] = [
  {
    id: "glm-5.1:cloud",
    name: "GLM 5.1 Cloud",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 202752,
    maxTokens: 32768,
  },
  {
    id: "gemma4:cloud",
    name: "Gemma 4 Cloud",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 262144,
    maxTokens: 32768,
  },
];

async function fetchCloudModels(ctx: ExtensionCommandContext): Promise<Record<string, OllamaShowResponse>> {
  const apiKey = await ctx.modelRegistry.getApiKeyForProvider("ollama-cloud");
  if (!apiKey) {
    ctx.ui.notify("No Ollama Cloud API key — set OLLAMA_API_KEY or auth.json", "error");
    return {};
  }

  // 1. GET /v1/models
  let res: Response;
  try {
    res = await fetchT(`${CLOUD_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    ctx.ui.notify("Cannot reach Ollama Cloud", "error");
    return {};
  }
  if (!res.ok) {
    ctx.ui.notify(`Cloud /v1/models failed: ${res.status}`, "error");
    return {};
  }

  const list = (await res.json()) as { data: { id: string }[] };
  const ids = list.data.map((m) => m.id);
  ctx.ui.notify(`Cloud: ${ids.length} models found, fetching details...`);

  // 2. POST /api/show per model in parallel
  const results: Record<string, OllamaShowResponse> = {};
  const settled = await Promise.allSettled(
    ids.map(async (id) => {
      try {
        const r = await fetchT(`${CLOUD_BASE}/api/show`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: id }),
        });
        if (r.ok) results[id] = (await r.json()) as OllamaShowResponse;
      } catch {
        // skip timed-out models
      }
    }),
  );

  const failed = settled.filter((r) => r.status === "rejected").length;
  ctx.ui.notify(
    `Cloud: ${Object.keys(results).length} model details fetched${failed ? ` (${failed} failed)` : ""}`,
    "info",
  );

  return results;
}

// ─── Tool rendering ───────────────────────────────────────────────────────────

const PREVIEW_LINES = 8;

function createRenderResult() {
  return (
    result: { content: Array<{ type: string; text: string }>; isError?: boolean },
    options: { expanded: boolean; isPartial: boolean },
    theme: import("@mariozechner/pi-coding-agent").Theme,
    context: {
      invalidate: () => void;
      lastComponent: import("@mariozechner/pi-tui").Component | undefined;
      state: { cachedWidth?: number; cachedLines?: string[]; cachedSkipped?: number };
    },
  ) => {
    const state = context.state;
    const output = result.content
      .map((c) => c.text)
      .join("")
      .trim();
    const styled = output.split("\n").map((line: string) => theme.fg("toolOutput", line)).join("\n");

    if (options.expanded || result.isError) {
      const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
      text.setText(result.isError ? styled : `\n${styled}`);
      return text;
    }

    return {
      render: (width: number) => {
        if (state.cachedWidth !== width) {
          const preview = truncateToVisualLines(styled, PREVIEW_LINES, width);
          state.cachedLines = preview.visualLines;
          state.cachedSkipped = preview.skippedCount;
          state.cachedWidth = width;
        }
        if (state.cachedSkipped && state.cachedSkipped > 0) {
          const hint =
            theme.fg("muted", `... (${state.cachedSkipped} earlier lines,`) +
            ` ${keyHint("app.tools.expand", "to expand")})`;
          return ["", truncateToWidth(hint, width, "..."), ...(state.cachedLines ?? [])];
        }
        return ["", ...(state.cachedLines ?? [])];
      },
      invalidate: () => {
        state.cachedWidth = undefined;
        state.cachedLines = undefined;
        state.cachedSkipped = undefined;
      },
    };
  };
}

// ─── Provider registration helpers ────────────────────────────────────────────

function registerLocalProvider(pi: ExtensionAPI, models: ProviderModelConfig[]) {
  pi.registerProvider("ollama", {
    baseUrl: `${LOCAL_BASE}/v1`,
    // Dummy literal — local ollama doesn't validate auth.
    // pi resolves this as env var OLLAMA_API_KEY if set, else literal "ollama" (works either way).
    apiKey: "ollama",
    api: "openai-completions",
    models,
  });
}

function registerCloudProvider(pi: ExtensionAPI, models: ProviderModelConfig[]) {
  pi.registerProvider("ollama-cloud", {
    baseUrl: `${CLOUD_BASE}/v1`,
    apiKey: "OLLAMA_API_KEY",
    api: "openai-completions",
    models,
  });
}

// ─── /ollama status ────────────────────────────────────────────────────────────

async function handleStatus(ctx: ExtensionCommandContext) {
  const [localUp, cloudKey] = await Promise.all([
    isLocalRunning(),
    ctx.modelRegistry.getApiKeyForProvider("ollama-cloud"),
  ]);

  const lines = [
    "🦙 Ollama Status",
    "",
    `Local:  ${localUp ? "✅ Connected" : "❌ Not running"}`,
    `Cloud:  ${cloudKey ? "✅ API key set" : "❌ No API key"}`,
    "",
    `Local URL:  ${LOCAL_BASE}`,
    `Cloud URL:  ${CLOUD_BASE}`,
  ];

  ctx.ui.notify(lines.join("\n"), "info");
}

// ─── /ollama update ────────────────────────────────────────────────────────────

async function handleUpdate(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  ctx.ui.setWorkingMessage("Refreshing Ollama models...");
  const results: string[] = [];

  // Local
  if (await isLocalRunning()) {
    const local = await fetchLocalModels();
    if (local && local.models.length > 0) {
      const models = assembleLocalModels(local.models, local.details);
      registerLocalProvider(pi, models);
      results.push(`📍 Local: ${models.length} models`);
    } else {
      results.push("📍 Local: no models found");
    }
  } else {
    results.push("📍 Local: not running (skipped)");
  }

  // Cloud
  const cloudKey = await ctx.modelRegistry.getApiKeyForProvider("ollama-cloud");
  if (cloudKey) {
    const raw = await fetchCloudModels(ctx);
    if (Object.keys(raw).length > 0) {
      writeCache(raw);
      const models = assembleCloudModels(raw);
      registerCloudProvider(pi, models);
      results.push(`☁️  Cloud: ${models.length} tool-capable models`);
    } else {
      results.push("☁️  Cloud: fetch failed (keeping cached models)");
    }
  } else {
    results.push("☁️  Cloud: no API key (skipped)");
  }

  ctx.ui.notify(`🦙 Updated\n${results.join("\n")}`, "info");
  ctx.ui.setWorkingMessage();
}

// ─── Web tools ─────────────────────────────────────────────────────────────────

function registerWebTools(pi: ExtensionAPI) {
  const getCloudKey = (ctx: ExtensionContext) => ctx.modelRegistry.getApiKeyForProvider("ollama-cloud");
  const renderResult = createRenderResult();

  pi.registerTool({
    name: "ollama_web_search",
    label: "Ollama Web Search",
    description:
      "Search the web for real-time information using Ollama Cloud. " +
      "Returns titles, URLs, and content snippets. Requires OLLAMA_API_KEY.",
    promptSnippet: "Search the web via Ollama Cloud",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      max_results: Type.Optional(
        Type.Number({ description: "Max results (1-10, default 5)", default: 5 }),
      ),
    }),
    async execute(_, params, signal, _onUpdate, ctx) {
      const apiKey = await getCloudKey(ctx);
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Error: No Ollama Cloud API key. Set OLLAMA_API_KEY or auth.json." }],
          isError: true,
        };
      }

      try {
        const res = await fetchT(
          `${CLOUD_BASE}/api/web_search`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: params.query, max_results: params.max_results ?? 5 }),
            signal,
          },
        );

        if (!res.ok) {
          const err = await res.text().catch(() => res.statusText);
          return { content: [{ type: "text", text: `Search error (${res.status}): ${err}` }], isError: true };
        }

        const data = (await res.json()) as {
          results: Array<{ title: string; url: string; content: string }>;
        };
        const formatted = data.results
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`)
          .join("\n\n");

        return {
          content: [{ type: "text", text: formatted || "No results found." }],
          details: { results: data.results },
        };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `Web search failed: ${err instanceof Error ? err.message : err}` },
          ],
          isError: true,
        };
      }
    },
    renderResult,
  });

  pi.registerTool({
    name: "ollama_web_fetch",
    label: "Ollama Web Fetch",
    description:
      "Fetch and extract text from a web page URL using Ollama Cloud. " +
      "Returns title, content, and links. Requires OLLAMA_API_KEY.",
    promptSnippet: "Fetch a web page via Ollama Cloud",
    parameters: Type.Object({
      url: Type.String({ description: "URL to fetch" }),
    }),
    async execute(_, params, signal, _onUpdate, ctx) {
      const apiKey = await getCloudKey(ctx);
      if (!apiKey) {
        return {
          content: [{ type: "text", text: "Error: No Ollama Cloud API key. Set OLLAMA_API_KEY or auth.json." }],
          isError: true,
        };
      }

      try {
        const res = await fetchT(
          `${CLOUD_BASE}/api/web_fetch`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: params.url }),
            signal,
          },
        );

        if (!res.ok) {
          const err = await res.text().catch(() => res.statusText);
          return { content: [{ type: "text", text: `Fetch error (${res.status}): ${err}` }], isError: true };
        }

        const data = (await res.json()) as { title: string; content: string; links: string[] };
        const formatted = [
          `Title: ${data.title}`,
          "",
          "Content:",
          data.content,
          "",
          `Links: ${data.links?.length ?? 0}`,
          ...(data.links?.slice(0, 10).map((l) => `  - ${l}`) ?? []),
        ].join("\n");

        return {
          content: [{ type: "text", text: formatted }],
          details: { title: data.title, content: data.content, links: data.links },
        };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `Web fetch failed: ${err instanceof Error ? err.message : err}` },
          ],
          isError: true,
        };
      }
    },
    renderResult,
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  // Boot: cloud from cache or fallback
  const cached = readCache();
  registerCloudProvider(pi, cached ? assembleCloudModels(cached) : FALLBACK_MODELS);

  // Boot: try local discovery (non-blocking for cloud if local is down)
  if (await isLocalRunning()) {
    const local = await fetchLocalModels();
    if (local && local.models.length > 0) {
      registerLocalProvider(pi, assembleLocalModels(local.models, local.details));
    }
  }

  // Command: /ollama
  pi.registerCommand("ollama", {
    description: "Ollama management (status | update)",
    getArgumentCompletions(prefix: string) {
      const subs = ["status", "update"];
      const filtered = subs.filter((s) => s.startsWith(prefix));
      return filtered.length > 0 ? filtered.map((s) => ({ value: s, label: s })) : null;
    },
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const [sub] = args.trim().split(/\s+/);
      switch (sub) {
        case "status":
          return handleStatus(ctx);
        case "update":
          return handleUpdate(pi, ctx);
        default:
          ctx.ui.notify(
            ["🦙 /ollama commands:", "", "  status  — Connection status (local + cloud)", "  update  — Refresh model list"].join("\n"),
            "info",
          );
      }
    },
  });

  // Web tools (cloud-only, no local server needed)
  registerWebTools(pi);
}