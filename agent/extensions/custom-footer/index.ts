/**
 * Custom Footer with TPS Extension
 *
 * Based on oh-pi custom-footer but adds TPS (tokens per second) and last query time.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

export function formatElapsed(ms: number): string {
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

type UsageTotals = { input: number; output: number; };

export function accumulateUsage(totals: UsageTotals, message: AssistantMessage): void {
  totals.input += Number(message.usage.input) || 0;
  totals.output += Number(message.usage.output) || 0;
}

export type { UsageTotals };

function collectTotals(ctx: Pick<ExtensionContext, "sessionManager">): UsageTotals {
  const totals: UsageTotals = { input: 0, output: 0, cost: 0 };
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "assistant") {
      accumulateUsage(totals, entry.message as AssistantMessage);
    }
  }
  return totals;
}

export default function (pi: ExtensionAPI) {
  let sessionStart = Date.now();
  let usageTotals: UsageTotals = { input: 0, output: 0 };
  let footerData: ReadonlyFooterDataProvider | null = null;
  let cachedCtx: ExtensionContext | null = null;
  let agentStartMs = 0;
  let lastTps = 0;
  let lastQueryTime = 0;

  pi.on("agent_start", () => {
    agentStartMs = Date.now();
  });

  pi.on("agent_end", (event) => {
    let output = 0;
    for (const message of event.messages) {
      if (message.role === "assistant") {
        output += (message as AssistantMessage).usage.output || 0;
      }
    }
    const elapsed = Date.now() - agentStartMs;
    if (elapsed > 0 && output > 0) {
      lastTps = output / (elapsed / 1000);
      lastQueryTime = elapsed;
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    sessionStart = Date.now();
    usageTotals = collectTotals(ctx);
    cachedCtx = ctx;

    ctx.ui.setFooter((tui, theme, fd) => {
      footerData = fd;
      const unsub = fd.onBranchChange(() => tui.requestRender());
      const timer = setInterval(() => tui.requestRender(), 30000);

      return {
        dispose() { unsub(); clearInterval(timer); },
        invalidate() {},
        render(width: number): string[] {
          const usage = ctx.getContextUsage();
          const pct = usage?.percent ?? 0;
          const pctColor = pct > 75 ? "error" : pct > 50 ? "warning" : "success";

          const tokenStats = [
            theme.fg("accent", `${fmt(usageTotals.input)}/${fmt(usageTotals.output)}`),
            theme.fg(pctColor, `${pct.toFixed(0)}%`),
          ].join(" ");

          const elapsed = theme.fg("dim", `⏱${formatElapsed(Date.now() - sessionStart)}`);

          const parts = process.cwd().split("/");
          const short = parts.length > 2 ? parts.slice(-2).join("/") : process.cwd();
          const cwdStr = theme.fg("muted", `⌂ ${short}`);

          const branch = footerData?.getGitBranch?.();
          const branchStr = branch ? theme.fg("accent", `⎇ ${branch}`) : "";

          const thinking = pi.getThinkingLevel();
          const thinkColor = thinking === "high" ? "warning" : thinking === "medium" ? "accent" : thinking === "low" ? "dim" : "muted";
          const modelId = ctx.model?.id || "no-model";
          const provider = (ctx.model as { provider?: string })?.provider || "";
          const modelStr = provider
            ? `${theme.fg(thinkColor, "◆")} ${theme.fg("dim", provider)}${theme.fg("dim", "/")}${theme.fg("accent", modelId)}`
            : `${theme.fg(thinkColor, "◆")} ${theme.fg("accent", modelId)}`;

          const sep = theme.fg("dim", " | ");

          // TPS and last query time
          let tpsStr = "";
          if (lastTps > 0) {
            tpsStr = theme.fg("success", `${lastTps.toFixed(1)} tok/s`);
          }
          let queryTimeStr = "";
          if (lastQueryTime > 0) {
            queryTimeStr = theme.fg("dim", formatElapsed(lastQueryTime));
          }

          const leftParts = [modelStr, tokenStats, elapsed, cwdStr];
          if (branchStr) leftParts.push(branchStr);
          if (tpsStr) leftParts.push(tpsStr);
          if (queryTimeStr) leftParts.push(queryTimeStr);

          return [truncateToWidth(leftParts.join(sep), width)];
        },
      };
    });
  });

  pi.on("session_switch", (event, ctx) => {
    usageTotals = collectTotals(ctx);
    if (event.reason === "new") sessionStart = Date.now();
  });

  pi.on("session_tree", (_event, ctx) => { usageTotals = collectTotals(ctx); });
  pi.on("session_fork", (_event, ctx) => { usageTotals = collectTotals(ctx); });

  pi.on("turn_end", (event) => {
    if (event.message.role === "assistant") {
      accumulateUsage(usageTotals, event.message as AssistantMessage);
    }
  });
}
