/**
 * Auto-resume — shows the built-in session selector on startup
 * when the cwd has existing sessions. Selecting a session opens it
 * directly, with full /resume UI (Tab, filter, Ctrl+D, Ctrl+R).
 *
 * switchSession is only available in command handlers, so a small
 * internal command auto-triggers the switch after selection.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { SessionManager, SessionSelectorComponent } from "@mariozechner/pi-coding-agent";

let prompted = false;
let pendingSwitch: string | null = null;

export default function (pi: ExtensionAPI) {
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
		// Only on fresh startup
		if (event.reason !== "startup") return;
		if (!ctx.hasUI) return;

		if (prompted) return;

		prompted = true;

		const sessions = await SessionManager.list(ctx.cwd);
		if (sessions.length === 0) return;

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
						const sm = SessionManager.open(sessionFilePath);
						sm.appendSessionInfo(next);
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

		// Auto-submit via terminal input injection.
		// Intercept the next terminal input and replace with Enter.
		let submitted = false;
		const unsub = ctx.ui.onTerminalInput(() => {
			submitted = true;
			unsub();
			clearTimeout(cleanupTimer);
			return { data: "\r" };
		});

		// Send cursor position report to elicit a terminal response.
		// If the terminal doesn't respond, the next real keypress
		// will trigger the submit instead (fallback).
		const cprTimer = setTimeout(() => process.stdout.write("\x1b[6n"), 100);

		// Clean up if auto-submit hasn't happened after 3s —
		// the user can still press Enter manually.
		const cleanupTimer = setTimeout(() => {
			if (!submitted) {
				unsub();
			}
			clearTimeout(cprTimer);
		}, 3000);
	});

	// Reset state when session ends cleanly
	pi.on("session_end", () => {
		prompted = false;
		pendingSwitch = null;
	});
}