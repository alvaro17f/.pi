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

export default function (pi: ExtensionAPI) {
  let enabled = true;
  let sessionStart = Date.now();
  let usageTotals: UsageTotals = { input: 0, output: 0 };
  let footerData: ReadonlyFooterDataProvider | null = null;
  let tuiRef: { requestRender(): void } | null = null;
  let agentStartMs = 0;
  let lastTps = 0;
  let lastQueryTime = 0;
  let disposeFooter: (() => void) | null = null;

  function resetRefs() {
    footerData = null;
    tuiRef = null;
    agentStartMs = 0;
    lastTps = 0;
    lastQueryTime = 0;
  }

  function clearState() {
    if (disposeFooter) {
      const d = disposeFooter;
      disposeFooter = null;
      d();
    } else {
      resetRefs();
    }
  }

  pi.on("agent_start", () => {
    agentStartMs = Date.now();
    lastTps = 0;
    lastQueryTime = 0;
    tuiRef?.requestRender();
  });

  pi.on("agent_end", (event) => {
    if (agentStartMs === 0) return;
    let output = 0;
    for (const m of event.messages) {
      if (m.role === "assistant") {
        const out = Number((m as AssistantMessage).usage?.output);
        if (Number.isFinite(out)) output += out;
      }
    }
    const elapsed = Date.now() - agentStartMs;
    if (elapsed > 0 && output > 0) {
      lastTps = output / (elapsed / 1000);
      lastQueryTime = elapsed;
    }
    agentStartMs = 0;
    tuiRef?.requestRender();
  });

  function installFooter(ctx: ExtensionContext) {
    usageTotals = collectTotals(ctx);

    ctx.ui.setFooter((tui, theme, fd) => {
      footerData = fd;
      tuiRef = tui;
      const unsub = fd.onBranchChange(() => tui.requestRender());
      const timer = setInterval(() => tui.requestRender(), 30000);
      disposeFooter = () => {
        unsub();
        clearInterval(timer);
        resetRefs();
      };

      return {
        dispose: disposeFooter,
        invalidate() {},
        render(width: number): string[] {
          const usage = ctx.getContextUsage();
          const pct = usage?.percent ?? 0;
          const pctColor = pct > 75 ? "error" : pct > 50 ? "warning" : "success";

          const tokenStats =
            theme.fg("accent", `${fmt(usageTotals.input)}/${fmt(usageTotals.output)}`) +
            " " +
            theme.fg(pctColor, `${pct.toFixed(0)}%`);
          const elapsed = theme.fg("dim", `⏱${formatElapsed(Date.now() - sessionStart)}`);

          const parts = ctx.cwd.split("/");
          const short = parts.length > 2 ? parts.slice(-2).join("/") : ctx.cwd;
          const cwdStr = theme.fg("muted", `⌂ ${short}`);

          const branch = fd.getGitBranch();
          const branchStr = branch ? theme.fg("accent", `⎇ ${branch}`) : "";

          const thinking = pi.getThinkingLevel();
          const thinkColor =
            thinking === "high" ? "warning" :
            thinking === "medium" ? "accent" :
            thinking === "low" ? "dim" : "muted";
          const modelId = ctx.model?.id || "no-model";
          const provider = (ctx.model as { provider?: string })?.provider || "";
          const modelStr = provider
            ? `${theme.fg(thinkColor, "◆")} ${theme.fg("dim", provider)}${theme.fg("dim", "/")}${theme.fg("accent", modelId)}`
            : `${theme.fg(thinkColor, "◆")} ${theme.fg("accent", modelId)}`;

          const statuses = fd.getExtensionStatuses();
          const statusStr = statuses.size > 0 ? theme.fg("dim", Array.from(statuses.values()).join(" | ")) : "";

          let tpsStr = "";
          if (lastTps > 0) tpsStr = theme.fg("success", `${lastTps.toFixed(1)} tok/s`);
          let queryTimeStr = "";
          if (lastQueryTime > 0) queryTimeStr = theme.fg("dim", formatElapsed(lastQueryTime));

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
    if (!enabled) return;
    clearState();
    if (event.reason === "new" || event.reason === "fork" || event.reason === "startup") {
      sessionStart = Date.now();
      lastTps = 0;
      lastQueryTime = 0;
      agentStartMs = 0;
    }
    installFooter(ctx);
  });

  pi.on("session_shutdown", async () => {
    clearState();
  });

  pi.on("session_switch", (event, ctx) => {
    usageTotals = collectTotals(ctx);
    if (event.reason === "new") {
      sessionStart = Date.now();
      lastTps = 0;
      lastQueryTime = 0;
      agentStartMs = 0;
    }
    tuiRef?.requestRender();
  });

  pi.on("session_tree", (_event, ctx) => {
    usageTotals = collectTotals(ctx);
    tuiRef?.requestRender();
  });

  pi.on("session_fork", (_event, ctx) => {
    usageTotals = collectTotals(ctx);
    tuiRef?.requestRender();
  });

  pi.on("turn_end", (event) => {
    if (event.message.role === "assistant") {
      accumulateUsage(usageTotals, event.message as AssistantMessage);
      tuiRef?.requestRender();
    }
  });

  pi.on("model_select", () => {
    tuiRef?.requestRender();
  });

  pi.registerCommand("footer", {
    description: "Toggle custom footer",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      if (enabled) {
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
