/**
 * Git Guard Extension
 *
 * Three safety features for git-managed repositories:
 * 1. Dirty repo warning — notifies at session start if there are uncommitted changes
 * 2. Turn checkpoints — creates a git stash snapshot before each agent turn
 * 3. Terminal notification — sends a desktop/terminal notification when the agent finishes
 *
 * Supports Kitty (OSC 99) and generic terminal (OSC 777) notification protocols.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Send a terminal notification using the appropriate escape sequence.
 * Kitty terminals use OSC 99, others use OSC 777 (supported by iTerm2, foot, etc.).
 */
export function terminalNotify(title: string, body: string): void {
  if (!process.stdout.isTTY) return;
  if (process.env.KITTY_WINDOW_ID) {
    process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`);
    process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`);
  } else {
    process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
  }
}

export function formatTurnMessage(count: number): string {
  return `Done after ${count} turn(s). Ready for input.`;
}

export default function (pi: ExtensionAPI) {
  /** Counts the number of agent turns for the checkpoint label. */
  let turnCount = 0;
  /** Stores git stash refs created as checkpoints. */
  const stashRefs: string[] = [];

  // Warn on dirty repo at session start
  pi.on("session_start", async (_event, ctx) => {
    try {
      const { stdout } = await pi.exec("git", ["status", "--porcelain"]);
      if (stdout.trim() && ctx.hasUI) {
        const lines = stdout.trim().split("\n").length;
        ctx.ui.notify(`Dirty repo: ${lines} uncommitted change(s)`, "warning");
      }
    } catch {
      // Not a git repo — nothing to warn about
    }
  });

  // Stash checkpoint before each turn
  pi.on("turn_start", async () => {
    turnCount++;
    try {
      const { stdout } = await pi.exec("git", ["stash", "create", "-m", `checkpoint-${turnCount}`]);
      const ref = stdout.trim();
      if (ref) {
        stashRefs.push(ref);
      }
    } catch {
      // Not a git repo — skip silently
    }
  });

  // Notify when agent is done
  pi.on("agent_end", () => {
    if (!process.stdout.isTTY) return;
    terminalNotify("pi", formatTurnMessage(turnCount));
    turnCount = 0;
  });

  // Register command to list checkpoint refs
  pi.registerCommand("git-checkpoints", {
    description: "List git stash checkpoint refs from this session",
    handler: async (_args, ctx) => {
      if (stashRefs.length === 0) {
        ctx.ui.notify("No checkpoints recorded this session.", "info");
        return;
      }
      const list = stashRefs.map((ref, i) => `${i + 1}. ${ref}`).join("\n");
      ctx.ui.notify(`Checkpoint refs:\n${list}\n\nRestore with: git stash apply <ref>`, "info");
    },
  });
}