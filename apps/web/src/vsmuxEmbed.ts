export type VSmuxEmbedBootstrap = {
  embedMode: "vsmux-mobile";
  httpOrigin: string;
  sessionId: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

export const VSMUX_FOCUS_COMPOSER_EVENT = "vsmux:focus-composer";
const VSMUX_PASTE_TRACE_TAG = "[VSMUX_PASTE_TRACE]";
const MAX_PASTE_TRACE_TEXT_LENGTH = 180;

declare global {
  interface Window {
    __VSMUX_T3_ACTIVE_THREAD_ID__?: string;
    __VSMUX_T3_ACTIVE_THREAD_TITLE__?: string;
    __VSMUX_T3_COMPOSER_FOCUS_ENABLED__?: boolean;
    __VSMUX_T3_BOOTSTRAP__?: VSmuxEmbedBootstrap;
  }
}

declare global {
  var acquireVsCodeApi:
    | (() => {
        postMessage: (message: unknown) => void;
      })
    | undefined;
}

export function getVSmuxEmbedBootstrap(): VSmuxEmbedBootstrap | undefined {
  return typeof window === "undefined" ? undefined : window.__VSMUX_T3_BOOTSTRAP__;
}

export function isVSmuxEmbed(): boolean {
  return getVSmuxEmbedBootstrap()?.embedMode === "vsmux-mobile";
}

export function canVSmuxComposerTakeFocus(): boolean {
  if (typeof window === "undefined" || !isVSmuxEmbed()) {
    return true;
  }

  return window.__VSMUX_T3_COMPOSER_FOCUS_ENABLED__ === true;
}

export function rememberVSmuxReturnThreadId(threadId: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  const bootstrap = getVSmuxEmbedBootstrap();
  if (!bootstrap) {
    return;
  }
  const storageKey = getVSmuxReturnThreadStorageKey(bootstrap.sessionId);
  if (!threadId) {
    delete window.__VSMUX_T3_ACTIVE_THREAD_ID__;
    window.sessionStorage.removeItem(storageKey);
    return;
  }
  bootstrap.threadId = threadId;
  window.__VSMUX_T3_ACTIVE_THREAD_ID__ = threadId;
  window.sessionStorage.setItem(storageKey, threadId);
}

export function getRememberedVSmuxReturnThreadId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const bootstrap = getVSmuxEmbedBootstrap();
  if (!bootstrap) {
    return undefined;
  }
  return (
    window.sessionStorage.getItem(getVSmuxReturnThreadStorageKey(bootstrap.sessionId)) ?? undefined
  );
}

export function installVSmuxEmbedBridge(): void {
  if (typeof window === "undefined" || !isVSmuxEmbed()) {
    return;
  }

  window.addEventListener("message", (event) => {
    if (isVsmuxPastePayloadMessage(event.data)) {
      logPasteTrace("embed.message.vsmuxPastePayload", {
        files: summarizePasteTraceFiles(event.data.files),
        looksLikeFilePath: looksLikePasteTraceFilesystemPath(event.data.text),
        ...summarizePasteTraceText(event.data.text),
      });
      return;
    }

    if (!isHostFocusComposerMessage(event.data)) {
      return;
    }

    window.dispatchEvent(new CustomEvent(VSMUX_FOCUS_COMPOSER_EVENT));
  });

  const vscodeApi = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;
  vscodeApi?.postMessage({ type: "vsmuxReady" });
}

export function notifyVSmuxActiveThread(input: { threadId: string; title?: string | null }): void {
  if (typeof window === "undefined") {
    return;
  }

  const bootstrap = getVSmuxEmbedBootstrap();
  if (!bootstrap) {
    return;
  }

  rememberVSmuxReturnThreadId(input.threadId);
  if (input.title && input.title.trim().length > 0) {
    window.__VSMUX_T3_ACTIVE_THREAD_TITLE__ = input.title.trim();
  } else {
    delete window.__VSMUX_T3_ACTIVE_THREAD_TITLE__;
  }

  window.parent?.postMessage(
    {
      sessionId: bootstrap.sessionId,
      threadId: input.threadId,
      title: input.title ?? undefined,
      type: "vsmuxT3ThreadChanged",
    },
    "*",
  );
}

function isHostFocusComposerMessage(message: unknown): message is { type: "focusComposer" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "focusComposer"
  );
}

function isVsmuxPastePayloadMessage(message: unknown): message is {
  files: Array<{ name?: string; size?: number; type?: string }>;
  text: string;
  type: "vsmuxPastePayload";
} {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "vsmuxPastePayload" &&
    "text" in message &&
    typeof message.text === "string" &&
    "files" in message &&
    Array.isArray(message.files)
  );
}

function logPasteTrace(event: string, payload?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const serializedPayload = payload ? JSON.stringify(payload) : "{}";
  console.info(`${VSMUX_PASTE_TRACE_TAG} ${timestamp} ${event} ${serializedPayload}`);
}

function summarizePasteTraceFiles(
  files: ReadonlyArray<{ name?: string; size?: number; type?: string }>,
): Array<Record<string, unknown>> {
  return files.map((file) => ({
    name: file.name ?? "",
    size: typeof file.size === "number" ? file.size : undefined,
    type: file.type ?? "",
  }));
}

function summarizePasteTraceText(text: string): { textLength: number; textSnippet?: string } {
  const trimmedText = text.trim();
  return trimmedText
    ? {
        textLength: text.length,
        textSnippet: trimmedText.slice(0, MAX_PASTE_TRACE_TEXT_LENGTH),
      }
    : {
        textLength: text.length,
      };
}

function looksLikePasteTraceFilesystemPath(text: string): boolean {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return false;
  }

  return (
    trimmedText.startsWith("/") ||
    trimmedText.startsWith("file://") ||
    /^[A-Za-z]:[\\/]/.test(trimmedText)
  );
}

function getVSmuxReturnThreadStorageKey(sessionId: string): string {
  return `vsmux:return-thread-id:${sessionId}`;
}
