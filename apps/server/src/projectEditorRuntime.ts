import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ProjectEditorSession, ProjectId } from "@t3tools/contracts";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CODE_SERVER_ROOT = join(MODULE_DIR, "../../../../code-server");
const DEFAULT_CODE_SERVER_BASE_URL = "http://127.0.0.1:8080/";

type CodeServerHandle = {
  baseUrl: string;
  close(): Promise<void>;
  isAlive(): boolean;
  onExit(listener: (error: Error | null) => void): () => void;
};

type SharedEditorRuntime = {
  handle: CodeServerHandle;
  projectIds: Set<ProjectId>;
};

async function startSharedCodeServer(): Promise<CodeServerHandle> {
  if (await canReachCodeServer(DEFAULT_CODE_SERVER_BASE_URL)) {
    return {
      baseUrl: DEFAULT_CODE_SERVER_BASE_URL,
      async close() {},
      isAlive() {
        return true;
      },
      onExit() {
        return () => {};
      },
    };
  }

  const npmBinary = process.env.NPM_BINARY?.trim() || "npm";
  const child = spawn(npmBinary, ["run", "demo"], {
    cwd: CODE_SERVER_ROOT,
    env: createCodeServerEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = child.stdout;
  const stderr = child.stderr;
  if (!stdout || !stderr) {
    throw new Error("Editor runtime stdio pipes are unavailable");
  }

  const stderrChunks: string[] = [];
  const exitListeners = new Set<(error: Error | null) => void>();
  let exitError: Error | null = null;

  stdout.setEncoding("utf8");
  stderr.setEncoding("utf8");
  stderr.on("data", (chunk: string) => {
    stderrChunks.push(chunk);
  });

  const buildExitError = (code: number | null, signal: NodeJS.Signals | null) => {
    const stderrText = stderrChunks.join("").trim();
    return new Error(
      stderrText.length > 0
        ? `Editor runtime exited (code=${String(code)}, signal=${String(signal)}): ${stderrText}`
        : `Editor runtime exited (code=${String(code)}, signal=${String(signal)})`,
    );
  };

  child.once("error", (error) => {
    exitError = error;
    for (const listener of exitListeners) {
      listener(error);
    }
  });
  child.once("exit", (code, signal) => {
    exitError = buildExitError(code, signal);
    for (const listener of exitListeners) {
      listener(exitError);
    }
  });

  const baseUrl = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let stdoutBuffer = "";
    let stderrBuffer = "";

    const cleanup = () => {
      stdout.off("data", handleStdout);
      stderr.off("data", handleStderr);
      child.off("exit", handleProcessExit);
      child.off("error", handleError);
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      reject(error);
    };

    const handleStdout = (chunk: string) => {
      stdoutBuffer = appendOutputChunk(stdoutBuffer, chunk, (line) => {
        const readyMatch = line.match(/\bHTTP server listening on (http:\/\/\S+)/);
        if (!readyMatch?.[1]) {
          return false;
        }
        settled = true;
        cleanup();
        resolve(ensureTrailingSlash(readyMatch[1]));
        return true;
      });
    };

    const handleStderr = (chunk: string) => {
      stderrBuffer = appendOutputChunk(stderrBuffer, chunk, (line) => {
        const readyMatch = line.match(/\bHTTP server listening on (http:\/\/\S+)/);
        if (!readyMatch?.[1]) {
          return false;
        }
        settled = true;
        cleanup();
        resolve(ensureTrailingSlash(readyMatch[1]));
        return true;
      });
    };

    const handleProcessExit = (code: number | null, signal: NodeJS.Signals | null) => {
      const stderrText = stderrChunks.join("").trim();
      fail(
        new Error(
          stderrText.length > 0
            ? `Editor runtime exited before startup (code=${String(code)}, signal=${String(signal)}): ${stderrText}`
            : `Editor runtime exited before startup (code=${String(code)}, signal=${String(signal)})`,
        ),
      );
    };

    const handleError = (error: Error) => {
      fail(error);
    };

    stdout.on("data", handleStdout);
    stderr.on("data", handleStderr);
    child.once("exit", handleProcessExit);
    child.once("error", handleError);

    setTimeout(() => {
      fail(new Error("Timed out while starting editor runtime"));
    }, 20_000).unref();
  });

  await waitForCodeServerReady(baseUrl);

  return {
    baseUrl,
    async close() {
      if (child.exitCode !== null) {
        return;
      }

      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        child.once("exit", finish);
        child.kill("SIGTERM");
        setTimeout(() => {
          if (child.exitCode === null) {
            child.kill("SIGKILL");
          }
        }, 5_000).unref();
      });
    },
    isAlive() {
      return child.exitCode === null && !child.killed;
    },
    onExit(listener) {
      if (child.exitCode !== null) {
        listener(exitError);
        return () => {};
      }
      exitListeners.add(listener);
      return () => {
        exitListeners.delete(listener);
      };
    },
  };
}

export class ProjectEditorRuntimeManager {
  readonly #runtimeOperation = new LockQueue();
  #sharedRuntime: SharedEditorRuntime | null = null;

  async ensureSession(projectId: ProjectId, cwd: string): Promise<ProjectEditorSession> {
    return this.#runtimeOperation.run(async () => {
      const normalizedCwd = cwd.trim();
      const runtime = await this.#ensureSharedRuntime();
      runtime.projectIds.add(projectId);
      return {
        projectId,
        cwd: normalizedCwd,
        path: buildCodeServerSessionUrl(runtime.handle.baseUrl, normalizedCwd),
      };
    });
  }

  async disposeSession(projectId: ProjectId): Promise<void> {
    await this.#runtimeOperation.run(async () => {
      const runtime = this.#sharedRuntime;
      if (!runtime) {
        return;
      }

      runtime.projectIds.delete(projectId);
      if (runtime.projectIds.size > 0) {
        return;
      }

      this.#sharedRuntime = null;
      await runtime.handle.close().catch(() => undefined);
    });
  }

  async disposeAll(): Promise<void> {
    await this.#runtimeOperation.run(async () => {
      const runtime = this.#sharedRuntime;
      this.#sharedRuntime = null;
      if (!runtime) {
        return;
      }
      await runtime.handle.close().catch(() => undefined);
    });
  }

  async #ensureSharedRuntime(): Promise<SharedEditorRuntime> {
    const existing = this.#sharedRuntime;
    if (
      existing &&
      existing.handle.isAlive() &&
      (await canReachCodeServer(existing.handle.baseUrl))
    ) {
      return existing;
    }

    if (existing) {
      await existing.handle.close().catch(() => undefined);
      this.#sharedRuntime = null;
    }

    const handle = await startSharedCodeServer();
    const runtime: SharedEditorRuntime = {
      handle,
      projectIds: new Set<ProjectId>(),
    };

    this.#sharedRuntime = runtime;

    const unsubscribe = handle.onExit(() => {
      unsubscribe();
      if (this.#sharedRuntime?.handle !== handle) {
        return;
      }
      this.#sharedRuntime = null;
    });

    return runtime;
  }
}

class LockQueue {
  #tail = Promise.resolve();

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release!: () => void;
    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function buildCodeServerSessionUrl(baseUrl: string, cwd: string): string {
  const url = new URL(ensureTrailingSlash(baseUrl));
  url.searchParams.set("folder", cwd);
  return url.toString();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}

function appendOutputChunk(
  existingBuffer: string,
  chunk: string,
  onLine: (line: string) => boolean,
): string {
  let buffer = existingBuffer + chunk;
  let newlineIndex = buffer.indexOf("\n");
  while (newlineIndex >= 0) {
    const line = stripAnsi(buffer.slice(0, newlineIndex).trim());
    buffer = buffer.slice(newlineIndex + 1);
    if (onLine(line)) {
      return buffer;
    }
    newlineIndex = buffer.indexOf("\n");
  }
  return buffer;
}

async function canReachCodeServer(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(1_500),
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function waitForCodeServerReady(baseUrl: string): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < 60_000) {
    if (await canReachCodeServer(baseUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out while waiting for code-server to become ready at ${baseUrl}`);
}

function createCodeServerEnvironment(): NodeJS.ProcessEnv {
  const childEnv: NodeJS.ProcessEnv = {};

  for (const key of PASSTHROUGH_ENVIRONMENT_KEYS) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      childEnv[key] = value;
    }
  }

  return childEnv;
}

const PASSTHROUGH_ENVIRONMENT_KEYS = [
  "COLORTERM",
  "DISPLAY",
  "HOME",
  "LANG",
  "LC_ALL",
  "LOGNAME",
  "PATH",
  "SHELL",
  "SSH_AUTH_SOCK",
  "TERM",
  "TMPDIR",
  "USER",
  "WAYLAND_DISPLAY",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
] as const satisfies readonly (keyof NodeJS.ProcessEnv)[];
