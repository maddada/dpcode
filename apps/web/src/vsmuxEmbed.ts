export type VSmuxEmbedBootstrap = {
  embedMode: "vsmux-mobile";
  httpOrigin: string;
  sessionId: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

export const VSMUX_FOCUS_COMPOSER_EVENT = "vsmux:focus-composer";
const VSMUX_RETURN_THREAD_ID_KEY = "vsmux:return-thread-id";

declare global {
  interface Window {
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

export function rememberVSmuxReturnThreadId(threadId: string | null | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!threadId) {
    window.sessionStorage.removeItem(VSMUX_RETURN_THREAD_ID_KEY);
    return;
  }
  window.sessionStorage.setItem(VSMUX_RETURN_THREAD_ID_KEY, threadId);
}

export function getRememberedVSmuxReturnThreadId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.sessionStorage.getItem(VSMUX_RETURN_THREAD_ID_KEY) ?? undefined;
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

function isHostFocusComposerMessage(message: unknown): message is { type: "focusComposer" } {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "focusComposer"
  );
}
