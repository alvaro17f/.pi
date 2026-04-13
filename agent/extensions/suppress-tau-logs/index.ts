/**
 * Suppress Tau log messages.
 *
 * The pi-tau extension logs messages prefixed with "[Mirror]" at startup.
 * This extension permanently filters those messages by wrapping console methods.
 *
 * Uses a stable wrapper pattern — never replaces, so other patches are not clobbered.
 */

const PREFIX = "[Mirror]";

function isTauLog(args: unknown[]): boolean {
	const first = args[0];
	return typeof first === "string" && first.startsWith(PREFIX);
}

function wrapConsole(): void {
	for (const method of ["log", "debug", "warn", "error"] as const) {
		const original = console[method];
		console[method] = function (...args: unknown[]) {
			if (isTauLog(args)) return;
			return original.apply(this, args);
		};
	}
}

export default function suppressTauLogs() {
	wrapConsole();
}