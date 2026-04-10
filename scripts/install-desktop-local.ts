#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const APPLICATIONS_DIR = "/Applications";
const BUNDLE_IDENTIFIER = "com.t3tools.t3code";
const APP_EXIT_TIMEOUT_MS = 15_000;
const APP_EXIT_POLL_INTERVAL_MS = 250;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const outputDir = resolve(repoRoot, "release/local-install");

type RunOptions = {
  readonly cwd?: string;
  readonly stdio?: "ignore" | "inherit";
};

function run(command: string, args: ReadonlyArray<string>, options: RunOptions = {}): void {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.stdio ?? "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status ?? "unknown"}): ${command} ${args.join(" ")}`.trim(),
    );
  }
}

function runIgnoringFailure(
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): boolean {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.stdio ?? "ignore",
  });
  return result.status === 0;
}

function findAppBundle(root: string): string | null {
  if (!existsSync(root)) {
    return null;
  }

  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      return entryPath;
    }
    if (entry.isDirectory()) {
      const nested = findAppBundle(entryPath);
      if (nested) return nested;
    }
  }

  return null;
}

function isAppRunning(appName: string): boolean {
  return runIgnoringFailure("pgrep", ["-x", appName]);
}

async function quitInstalledApp(appName: string): Promise<void> {
  if (!isAppRunning(appName)) {
    return;
  }

  runIgnoringFailure("osascript", ["-e", `tell application id "${BUNDLE_IDENTIFIER}" to quit`], {
    stdio: "ignore",
  });

  const deadline = Date.now() + APP_EXIT_TIMEOUT_MS;
  while (isAppRunning(appName) && Date.now() < deadline) {
    await delay(APP_EXIT_POLL_INTERVAL_MS);
  }

  if (!isAppRunning(appName)) {
    return;
  }

  runIgnoringFailure("pkill", ["-x", appName], { stdio: "ignore" });

  while (isAppRunning(appName) && Date.now() < deadline) {
    await delay(APP_EXIT_POLL_INTERVAL_MS);
  }

  if (isAppRunning(appName)) {
    throw new Error(`Timed out waiting for ${appName} to quit.`);
  }
}

async function main(): Promise<void> {
  if (process.platform !== "darwin") {
    throw new Error("This install script currently only supports macOS.");
  }

  rmSync(outputDir, { recursive: true, force: true });

  run("node", [
    "scripts/build-desktop-artifact.ts",
    "--platform",
    "mac",
    "--target",
    "dir",
    "--output-dir",
    outputDir,
  ]);

  const builtAppPath = findAppBundle(outputDir);
  if (!builtAppPath) {
    throw new Error(`Could not find a built .app bundle under ${outputDir}.`);
  }

  const appName = basename(builtAppPath, ".app");
  const installedAppPath = join(APPLICATIONS_DIR, basename(builtAppPath));

  await quitInstalledApp(appName);

  rmSync(installedAppPath, { recursive: true, force: true });
  run("ditto", [builtAppPath, installedAppPath]);

  const installedStats = statSync(installedAppPath);
  if (!installedStats.isDirectory()) {
    throw new Error(`Installed app bundle is missing at ${installedAppPath}.`);
  }

  run("open", [installedAppPath]);
  console.log(`Installed and launched ${installedAppPath}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
