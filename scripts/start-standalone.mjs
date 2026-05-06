import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = join(root, ".next", "standalone");
const standaloneNextDir = join(standaloneDir, ".next");

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function ensureSymlink(target, linkPath) {
  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink() || stat.isDirectory()) return;
    throw new Error(`${linkPath} exists but is not a directory or symlink.`);
  }

  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath, "dir");
}

if (!existsSync(join(standaloneDir, "server.js"))) {
  throw new Error("Standalone build not found. Run `npm run build` first.");
}

loadEnvLocal();
ensureSymlink(join(root, ".next", "static"), join(standaloneNextDir, "static"));
ensureSymlink(join(root, "public"), join(standaloneDir, "public"));

const child = spawn(process.execPath, ["server.js"], {
  cwd: standaloneDir,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
