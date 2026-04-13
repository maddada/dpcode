export type VSmuxEmbedBootstrap = {
  embedMode: "vsmux-mobile";
  httpOrigin: string;
  sessionId: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

export const VSMUX_FOCUS_COMPOSER_EVENT = "vsmux:focus-composer";

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
  return window.sessionStorage.getItem(getVSmuxReturnThreadStorageKey(bootstrap.sessionId)) ?? undefined;
}

export function installVSmuxEmbedBridge(): void {
  if (typeof window === "undefined" || !isVSmuxEmbed()) {
    return;
  }

  window.addEventListener("message", (event) => {
    if (!isHostFocusComposerMessage(event.data)) {
      return;
    }

    window.dispatchEvent(new CustomEvent(VSMUX_FOCUS_COMPOSER_EVENT));
  });

  const vscodeApi = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;
  vscodeApi?.postMessage({ type: "vsmuxReady" });
}

export function notifyVSmuxActiveThread(input: {
  threadId: string;
  title?: string | null;
}): void {
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

function getVSmuxReturnThreadStorageKey(sessionId: string): string {
  return `vsmux:return-thread-id:${sessionId}`;
}
