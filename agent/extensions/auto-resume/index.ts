/**
 * Session resume prompt.
 *
 * On startup, if the cwd has existing sessions, shows the built-in
 * session selector (same UI as /resume). Selecting a session opens
 * it directly.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { SessionManager, SessionSelectorComponent } from "@mariozechner/pi-coding-agent";

let prompted = false;
let pendingSwitch: string | null = null;

export default function (pi: ExtensionAPI) {
	// switchSession is only available in ExtensionCommandContext,
	// not in ExtensionContext (event handlers). A command is the
	// only way to access it. We auto-trigger it so the user never
	// interacts with it directly.
	pi.registerCommand("resume-selected", {
		description: "Resume previously selected session",
		handler: async (_args, ctx) => {
			if (!pendingSwitch) return;
			const path = pendingSwitch;
			pendingSwitch = null;
			await ctx.switchSession(path);
		},
	});

	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "startup") return;
		if (prompted) return;
		if (!ctx.hasUI) return;

		prompted = true;

		const sessions = await SessionManager.list(ctx.cwd);
		if (sessions.length === 0) return;

		// Show the built-in /resume selector immediately
		const result = await ctx.ui.custom<string | null>((tui, theme, keybindings, done) => {
			const selector = new SessionSelectorComponent(
				(onProgress) => SessionManager.list(ctx.cwd, undefined, onProgress),
				(onProgress) => SessionManager.listAll(onProgress),
				(sessionPath) => done(sessionPath),
				() => done(null),
				() => done(null),
				() => tui.requestRender(),
				{
					renameSession: async (sessionFilePath, nextName) => {
						const next = (nextName ?? "").trim();
						if (!next) return;
						SessionManager.open(sessionFilePath).appendSessionInfo(next);
					},
					showRenameHint: true,
					keybindings,
				},
				ctx.sessionManager.getSessionFile() ?? undefined,
			);
			return selector;
		});

		if (!result) return;

		pendingSwitch = result;
		ctx.ui.setEditorText("/resume-selected");

		// Auto-submit: inject Enter keystroke into the terminal
		// via onTerminalInput + cursor position report.
		const unsub = ctx.ui.onTerminalInput(() => {
			unsub();
			return { data: "\r" };
		});
		setTimeout(() => process.stdout.write("\x1b[6n"), 100);
	});
}