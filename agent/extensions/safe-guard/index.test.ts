import { describe, expect, it } from "vitest";
import { DANGEROUS_PATTERNS, PROTECTED_PATHS } from "./index.js";

describe("DANGEROUS_PATTERNS", () => {
  const dangerousCommands = [
    "rm -rf /",
    "rm -rf node_modules",
    "rm -r --force folder",
    "sudo rm -rf /",
    "sudo rm folder",
    "DROP TABLE users",
    "TRUNCATE users",
    "DELETE FROM users WHERE id=1",
    "chmod 777 /etc/passwd",
    "mkfs.ext4 /dev/sda1",
    "dd if=/dev/zero of=/dev/sda",
    "> /dev/sda1",
  ];

  const safeCommands = [
    "rm file.txt",
    "rm -r folder",
    "ls -la",
    "git status",
    "npm install",
    "echo hello",
    "cat file.txt",
    "chmod 644 file.txt",
  ];

  it("should match dangerous commands", () => {
    for (const cmd of dangerousCommands) {
      const match = DANGEROUS_PATTERNS.find((p) => p.test(cmd));
      expect(match).toBeDefined();
    }
  });

  it("should not match safe commands", () => {
    for (const cmd of safeCommands) {
      const match = DANGEROUS_PATTERNS.find((p) => p.test(cmd));
      expect(match).toBeUndefined();
    }
  });
});

describe("PROTECTED_PATHS", () => {
  const protectedPaths = [
    ".env",
    ".env.local",
    ".git/config",
    ".git/",
    "node_modules/package/index.js",
    ".pi/settings.json",
    "id_rsa",
    ".ssh/authorized_keys",
  ];

  const safePaths = [
    "src/index.ts",
    "packages/foo/bar.ts",
    "README.md",
    "config.json",
    "env.backup",
    "git-hooks/pre-commit",
  ];

  it("should detect protected paths", () => {
    for (const path of protectedPaths) {
      const hit = PROTECTED_PATHS.find((p) => path.includes(p));
      expect(hit).toBeDefined();
    }
  });

  it("should not flag safe paths", () => {
    for (const path of safePaths) {
      const hit = PROTECTED_PATHS.find((p) => path.includes(p));
      expect(hit).toBeUndefined();
    }
  });
});