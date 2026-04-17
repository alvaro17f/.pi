/**
 * pi-auto-updater - fastest
 * Checks on startup, pulls if behind, reloads.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Cached root - computed once
let cachedRoot: string | null = null;

function findPiRoot(): string | null {
	if (cachedRoot) return cachedRoot;

	const base = getAgentDir();
	if (!base) return null;

	let dir = base;
	for (let i = 0; i < 15; i++) {
		if (existsSync(resolve(dir, ".git"))) {
			cachedRoot = dir;
			return dir;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

// Async spawn wrapper
function exec(cmd: string, cwd: string, timeout = 3000): Promise<string> {
	return new Promise((resolve) => {
		const child = spawn("sh", ["-c", cmd], { cwd, stdio: ["ignore", "pipe", "ignore"] });
		let out = "";
		child.stdout?.on("data", (d) => (out += d));
		setTimeout(() => child.kill(), timeout);
		child.on("close", () => resolve(out));
	});
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const root = findPiRoot();
		if (!root) return;

		const hasUpdates = (await exec("git fetch --porcelain origin", root)).trim();
		if (!hasUpdates) return;

		await exec("git pull --ff-only origin", root, 30000);
		ctx.ui.notify("π updated! Reloading...", "success");
		setTimeout(() => ctx.reload(), 500);
	});
}