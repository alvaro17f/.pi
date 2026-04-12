/**
 * Suppress pi-ollama log messages.
 *
 * The @0xkobold/pi-ollama extension uses console.log/error/debug directly,
 * which pi captures and displays. This extension permanently filters messages
 * prefixed with "[pi-ollama]" by wrapping console methods once.
 *
 * Uses a stable wrapper pattern — each method is wrapped once and the wrapper
 * is never replaced. Other extensions can safely patch console methods on top
 * without this filter being clobbered.
 */

const PREFIX = "[pi-ollama]";

function isOllamaLog(args: unknown[]): boolean {
	const first = args[0];
	return typeof first === "string" && first.startsWith(PREFIX);
}

function wrapConsole(): void {
	for (const method of ["log", "debug", "warn", "error"] as const) {
		const original = console[method];
		console[method] = function (...args: unknown[]) {
			if (isOllamaLog(args)) return;
			return original.apply(this, args);
		};
	}
}

export default function suppressOllamaLogs() {
	wrapConsole();
}