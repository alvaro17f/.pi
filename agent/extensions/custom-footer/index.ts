import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m${rs > 0 ? `${rs}s` : ""}`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h${rm > 0 ? `${rm}m` : ""}`;
}

export function fmt(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

type UsageTotals = { input: number; output: number };

export function accumulateUsage(totals: UsageTotals, message: AssistantMessage): void {
  const usage = message.usage;
  totals.input += Number.isFinite(Number(usage?.input)) ? Number(usage?.input) : 0;
  totals.output += Number.isFinite(Number(usage?.output)) ? Number(usage?.output) : 0;
}

export type { UsageTotals };

function collectTotals(ctx: Pick<ExtensionContext, "sessionManager">): UsageTotals {
  const totals: UsageTotals = { input: 0, output: 0 };
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "assistant") {
      accumulateUsage(totals, entry.message as AssistantMessage);
    }
  }
  return totals;
}

// State object (const, but properties mutable)
const state = {
  enabled: true,
  sessionStart: Date.now(),
  usageTotals: { input: 0, output: 0 } as UsageTotals,
  footerData: null as ReadonlyFooterDataProvider | null,
  tuiRef: null as { requestRender(): void } | null,
  currentModel: null as { id: string; provider?: string } | null,
  currentCwd: "",
  agentStartMs: 0,
  lastTps: 0,
  lastQueryTime: 0,
  disposeFooter: null as (() => void) | null,
  active: false,
};

export default function (pi: ExtensionAPI): void {
  function resetRefs() {
    state.footerData = null;
    state.tuiRef = null;
    state.agentStartMs = 0;
    state.lastTps = 0;
    state.lastQueryTime = 0;
    state.active = false;
  }

  function clearState() {
    if (state.disposeFooter) {
      const d = state.disposeFooter;
      state.disposeFooter = null;
      d();
    } else {
      resetRefs();
    }
  }

  pi.on("session_start", (event) => {
    state.currentCwd = (event as unknown as { cwd?: string }).cwd ?? "";
    state.currentModel = null;
  });

  pi.on("agent_start", () => {
    state.agentStartMs = Date.now();
    state.lastTps = 0;
    state.lastQueryTime = 0;
    state.tuiRef?.requestRender();
  });

  pi.on("agent_end", (event) => {
    if (state.agentStartMs === 0) return;
    const output = event.messages
      .filter((m) => m.role === "assistant")
      .reduce((sum, m) => {
        const out = Number((m as AssistantMessage).usage?.output);
        return Number.isFinite(out) ? sum + out : sum;
      }, 0);
    const elapsed = Date.now() - state.agentStartMs;
    if (elapsed > 0 && output > 0) {
      state.lastTps = output / (elapsed / 1000);
      state.lastQueryTime = elapsed;
    }
    state.agentStartMs = 0;
    state.tuiRef?.requestRender();
  });

  function installFooter(ctx: ExtensionContext) {
    state.currentCwd = ctx.cwd;
    state.currentModel = ctx.model as { id: string; provider?: string } | null ?? null;
    state.usageTotals = collectTotals(ctx);

    ctx.ui.setFooter((tui, theme, fd) => {
      state.footerData = fd;
      state.tuiRef = tui;
      const unsub = fd.onBranchChange(() => tui.requestRender());
      const timer = setInterval(() => tui.requestRender(), 30000);
      state.disposeFooter = () => {
        unsub();
        clearInterval(timer);
        resetRefs();
      };
      state.active = true;

      return {
        dispose: state.disposeFooter,
        invalidate() {},
        render(width: number): string[] {
          const pct = (() => { try { return ctx.getContextUsage()?.percent ?? 0; } catch { return 0; } })();
          const pctColor = pct > 75 ? "error" : pct > 50 ? "warning" : "success";

          const tokenStats =
            theme.fg("accent", `${fmt(state.usageTotals.input)}/${fmt(state.usageTotals.output)}`) +
            " " +
            theme.fg(pctColor, `${pct.toFixed(0)}%`);
          const elapsed = theme.fg("dim", `⏱${formatElapsed(Date.now() - state.sessionStart)}`);

          const cwd = state.currentCwd || ctx.cwd;
          const parts = cwd.split("/");
          const short = parts.length > 2 ? parts.slice(-2).join("/") : cwd;
          const cwdStr = theme.fg("muted", `⌂ ${short}`);

          const branch = fd.getGitBranch();
          const branchStr = branch ? theme.fg("accent", `⎇ ${branch}`) : "";

          const thinking = state.active ? pi.getThinkingLevel() : "off";
          const thinkColor =
            thinking === "high" ? "warning" :
            thinking === "medium" ? "accent" :
            thinking === "low" ? "dim" : "muted";
          const modelId = state.currentModel?.id ?? ctx.model?.id ?? "no-model";
          const provider = state.currentModel?.provider ?? (ctx.model as { provider?: string })?.provider ?? "";
          const modelStr = provider
            ? `${theme.fg(thinkColor, "◆")} ${theme.fg("dim", provider)}${theme.fg("dim", "/")}${theme.fg("accent", modelId)}`
            : `${theme.fg(thinkColor, "◆")} ${theme.fg("accent", modelId)}`;

          const statuses = fd.getExtensionStatuses();
          const statusStr = statuses.size > 0 ? theme.fg("dim", Array.from(statuses.values()).join(" | ")) : "";

          const tpsStr = state.lastTps > 0 ? theme.fg("success", `${state.lastTps.toFixed(1)} tok/s`) : "";
          const queryTimeStr = state.lastQueryTime > 0 ? theme.fg("dim", formatElapsed(state.lastQueryTime)) : "";

          const sep = theme.fg("dim", " | ");
          const leftParts = [modelStr, tokenStats, elapsed, cwdStr];
          if (branchStr) leftParts.push(branchStr);
          if (statusStr) leftParts.push(statusStr);
          if (tpsStr) leftParts.push(tpsStr);
          if (queryTimeStr) leftParts.push(queryTimeStr);

          const left = leftParts.join(sep);
          const pad = " ".repeat(Math.max(0, width - visibleWidth(left)));
          return [truncateToWidth(left + pad, width)];
        },
      };
    });
  }

  pi.on("session_start", async (event, ctx) => {
    if (!state.enabled) return;
    clearState();
    if (event.reason === "new" || event.reason === "fork" || event.reason === "startup") {
      state.sessionStart = Date.now();
      state.lastTps = 0;
      state.lastQueryTime = 0;
      state.agentStartMs = 0;
    }
    installFooter(ctx);
  });

  pi.on("session_shutdown", async () => {
    clearState();
  });

  pi.on("session_switch", (event, ctx) => {
    state.usageTotals = collectTotals(ctx);
    if (event.reason === "new") {
      state.sessionStart = Date.now();
      state.lastTps = 0;
      state.lastQueryTime = 0;
      state.agentStartMs = 0;
    }
    state.tuiRef?.requestRender();
  });

  pi.on("session_tree", (_event, ctx) => {
    state.usageTotals = collectTotals(ctx);
    state.tuiRef?.requestRender();
  });

  pi.on("session_fork", (_event, ctx) => {
    state.usageTotals = collectTotals(ctx);
    state.tuiRef?.requestRender();
  });

  pi.on("turn_end", (event) => {
    if (event.message.role === "assistant") {
      accumulateUsage(state.usageTotals, event.message as AssistantMessage);
      state.tuiRef?.requestRender();
    }
  });

  pi.on("model_select", (event) => {
    state.currentModel = event.model as { id: string; provider?: string } | null ?? null;
    state.tuiRef?.requestRender();
  });

  pi.registerCommand("footer", {
    description: "Toggle custom footer",
    handler: async (_args, ctx) => {
      state.enabled = !state.enabled;
      if (state.enabled) {
        clearState();
        installFooter(ctx);
        ctx.ui.notify("✓ custom footer", "success");
      } else {
        clearState();
        ctx.ui.setFooter(undefined);
        ctx.ui.notify("✗ default footer", "info");
      }
    },
  });
}