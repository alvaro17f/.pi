/**
 * Suppress pi-ollama startup log messages.
 *
 * The @0xkobold/pi-ollama extension uses console.log/error/debug directly,
 * which pi captures and displays. This extension filters those messages
 * by monkey-patching console methods before the ollama extension loads.
 *
 * Only messages prefixed with "[pi-ollama]" are suppressed during startup.
 * After a short delay, the original console methods are restored.
 */

const PREFIX = "[pi-ollama]";
const SUPPRESS_MS = 10_000; // Restore after 10s to avoid permanent patching

function patchAndRestore() {
  const originals = {
    log: console.log,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };

  function suppress(fn: (...args: unknown[]) => void) {
    return (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string" && first.startsWith(PREFIX)) return;
      return fn(...args);
    };
  }

  console.log = suppress(originals.log);
  console.debug = suppress(originals.debug);
  console.warn = suppress(originals.warn);
  console.error = suppress(originals.error);

  setTimeout(() => {
    console.log = originals.log;
    console.debug = originals.debug;
    console.warn = originals.warn;
    console.error = originals.error;
  }, SUPPRESS_MS);
}

export default function suppressOllamaLogs() {
  patchAndRestore();
}