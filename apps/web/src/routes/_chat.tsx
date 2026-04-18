import { type ProjectId, type ResolvedKeybindingsConfig } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ProjectEditorView } from "../components/project-editor/ProjectEditorView";
import ThreadSidebar from "../components/Sidebar";
import { useDisposableThreadLifecycle } from "../hooks/useDisposableThreadLifecycle";
import { useHandleNewThread } from "../hooks/useHandleNewThread";
import { useProjectEditorActions } from "../hooks/useProjectEditorActions";
import { isEmbeddedEditorFocused, isProjectEditorPathname } from "../lib/embeddedEditorFocus";
import { resolveThreadEnvironmentMode } from "../lib/threadEnvironment";
import { isTerminalFocused } from "../lib/terminalFocus";
import { serverConfigQueryOptions } from "../lib/serverReactQuery";
import { resolveShortcutCommand } from "../keybindings";
import { selectThreadTerminalState, useTerminalStateStore } from "../terminalStateStore";
import { useThreadSelectionStore } from "../threadSelectionStore";
import { resolveSidebarNewThreadEnvMode } from "~/components/Sidebar.logic";
import { useAppSettings } from "~/appSettings";
import { Sidebar, SidebarProvider, SidebarRail, useSidebar } from "~/components/ui/sidebar";
import { useChatCodeFont } from "~/hooks/useChatCodeFont";
import { useUIFont } from "~/hooks/useUIFont";
import { cn } from "~/lib/utils";
import { useProjectEditorStore } from "~/projectEditorStore";
import { isVSmuxEmbed } from "../vsmuxEmbed";

const EMPTY_KEYBINDINGS: ResolvedKeybindingsConfig = [];
const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;
const PROJECT_EDITOR_ROUTE_PATTERN = /^\/project\/([^/]+)\/editor(?:\/)?$/;

function parseProjectEditorRouteProjectId(pathname: string): ProjectId | null {
  const match = pathname.match(PROJECT_EDITOR_ROUTE_PATTERN);
  return (match?.[1] as ProjectId | undefined) ?? null;
}

function ChatRouteGlobalShortcuts() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { toggleSidebar } = useSidebar();
  const clearSelection = useThreadSelectionStore((state) => state.clearSelection);
  const selectedThreadIdsSize = useThreadSelectionStore((state) => state.selectedThreadIds.size);
  const {
    activeContextThreadId,
    activeDraftThread,
    activeProjectId,
    activeThread,
    handleNewThread,
    projects,
  } = useHandleNewThread();
  const { openCurrentProjectEditor, openCurrentProjectTerminal } = useProjectEditorActions();
  useDisposableThreadLifecycle(activeContextThreadId);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const keybindings = serverConfigQuery.data?.keybindings ?? EMPTY_KEYBINDINGS;
  const terminalOpen = useTerminalStateStore((state) =>
    activeContextThreadId
      ? selectThreadTerminalState(state.terminalStateByThreadId, activeContextThreadId).terminalOpen
      : false,
  );
  const { settings: appSettings } = useAppSettings();

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isProjectEditorPathname(pathname) && isEmbeddedEditorFocused()) {
        return;
      }

      if (event.key === "Escape" && selectedThreadIdsSize > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }

      const command = resolveShortcutCommand(event, keybindings, {
        context: {
          terminalFocus: isTerminalFocused(),
          terminalOpen,
        },
      });
      if (command === "sidebar.toggle") {
        event.preventDefault();
        event.stopPropagation();
        toggleSidebar();
        return;
      }

      if (!command) return;

      if (command === "chat.newLocal") {
        const projectId = activeProjectId ?? projects[0]?.id;
        if (!projectId) return;
        event.preventDefault();
        event.stopPropagation();
        void handleNewThread(projectId, {
          envMode: resolveSidebarNewThreadEnvMode({
            defaultEnvMode: appSettings.defaultThreadEnvMode,
          }),
        });
        return;
      }

      if (command === "chat.newTerminal") {
        const projectId = activeProjectId ?? projects[0]?.id;
        if (!projectId) return;
        event.preventDefault();
        event.stopPropagation();
        void handleNewThread(projectId, {
          branch: activeThread?.branch ?? activeDraftThread?.branch ?? null,
          worktreePath: activeThread?.worktreePath ?? activeDraftThread?.worktreePath ?? null,
          envMode:
            activeDraftThread?.envMode ??
            resolveThreadEnvironmentMode({
              envMode: activeThread?.envMode,
              worktreePath: activeThread?.worktreePath ?? null,
            }),
          entryPoint: "terminal",
        });
        return;
      }

      if (command === "chat.newClaude" || command === "chat.newCodex") {
        const projectId = activeProjectId ?? projects[0]?.id;
        if (!projectId) return;
        event.preventDefault();
        event.stopPropagation();
        void handleNewThread(projectId, {
          provider: command === "chat.newClaude" ? "claudeAgent" : "codex",
          branch: activeThread?.branch ?? activeDraftThread?.branch ?? null,
          worktreePath: activeThread?.worktreePath ?? activeDraftThread?.worktreePath ?? null,
          envMode:
            activeDraftThread?.envMode ??
            resolveThreadEnvironmentMode({
              envMode: activeThread?.envMode,
              worktreePath: activeThread?.worktreePath ?? null,
            }),
        });
        return;
      }

      if (command === "chat.openProjectEditor") {
        event.preventDefault();
        event.stopPropagation();
        void openCurrentProjectEditor();
        return;
      }

      if (command === "chat.openProjectTerminal") {
        event.preventDefault();
        event.stopPropagation();
        void openCurrentProjectTerminal();
        return;
      }

      if (command !== "chat.new") return;
      const projectId = activeProjectId ?? projects[0]?.id;
      if (!projectId) return;
      event.preventDefault();
      event.stopPropagation();
      void handleNewThread(projectId, {
        branch: activeThread?.branch ?? activeDraftThread?.branch ?? null,
        worktreePath: activeThread?.worktreePath ?? activeDraftThread?.worktreePath ?? null,
        envMode:
          activeDraftThread?.envMode ??
          resolveThreadEnvironmentMode({
            envMode: activeThread?.envMode,
            worktreePath: activeThread?.worktreePath ?? null,
          }),
      });
    };

    window.addEventListener("keydown", onWindowKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, { capture: true });
    };
  }, [
    activeDraftThread,
    activeProjectId,
    activeThread,
    clearSelection,
    handleNewThread,
    keybindings,
    projects,
    selectedThreadIdsSize,
    terminalOpen,
    toggleSidebar,
    pathname,
    appSettings.defaultThreadEnvMode,
    openCurrentProjectEditor,
    openCurrentProjectTerminal,
  ]);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "toggle-sidebar") {
        toggleSidebar();
        return;
      }
      if (action !== "open-settings") return;
      void navigate({ to: "/settings" });
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate, toggleSidebar]);

  return null;
}

const SIDEBAR_GAP_CLASS = {
  left: "overflow-hidden after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-black/[0.03] dark:after:bg-white/[0.015] before:absolute before:inset-0 before:bg-[radial-gradient(90%_75%_at_0%_0%,rgba(255,255,255,0.06),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] dark:before:bg-[radial-gradient(90%_75%_at_0%_0%,rgba(255,255,255,0.04),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))]",
  right:
    "overflow-hidden after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-black/[0.03] dark:after:bg-white/[0.015] before:absolute before:inset-0 before:bg-[radial-gradient(90%_75%_at_100%_0%,rgba(255,255,255,0.06),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] dark:before:bg-[radial-gradient(90%_75%_at_100%_0%,rgba(255,255,255,0.04),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))]",
} as const;

const SIDEBAR_INNER_CLASS = {
  left: "border-r border-border bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-lg backdrop-saturate-150 dark:border-white/[0.06] dark:bg-background/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
  right:
    "border-l border-border bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-lg backdrop-saturate-150 dark:border-white/[0.06] dark:bg-background/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
} as const;

function ChatRouteLayout() {
  useChatCodeFont();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useUIFont();
  const { settings } = useAppSettings();
  const side = settings.sidebarSide;
  const activeProjectEditorId = useMemo(
    () => parseProjectEditorRouteProjectId(pathname),
    [pathname],
  );

  const sidebarElement = (
    <Sidebar
      side={side}
      collapsible="offcanvas"
      className="text-foreground"
      gapClassName={SIDEBAR_GAP_CLASS[side]}
      innerClassName={SIDEBAR_INNER_CLASS[side]}
      transparentSurface
      resizable={{
        minWidth: THREAD_SIDEBAR_MIN_WIDTH,
        shouldAcceptWidth: ({ nextWidth, wrapper }) =>
          wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
        storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
      }}
    >
      <ThreadSidebar />
      <SidebarRail />
    </Sidebar>
  );

  return (
    <SidebarProvider defaultOpen={!isVSmuxEmbed()}>
      <ChatRouteGlobalShortcuts />
      {side === "left" ? sidebarElement : null}
      <div className="app-shell-min-height relative min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "h-full min-h-0 min-w-0 overflow-hidden",
            activeProjectEditorId && "hidden",
          )}
        >
          <Outlet />
        </div>
        <PersistentProjectEditorLayer activeProjectEditorId={activeProjectEditorId} />
      </div>
      {side === "right" ? sidebarElement : null}
    </SidebarProvider>
  );
}

function PersistentProjectEditorLayer(props: { activeProjectEditorId: ProjectId | null }) {
  const editorsByProjectId = useProjectEditorStore((store) => store.editorsByProjectId);
  const [mountedProjectEditorId, setMountedProjectEditorId] = useState<ProjectId | null>(null);

  useEffect(() => {
    const activeProjectEditorId = props.activeProjectEditorId;
    if (!activeProjectEditorId) {
      return;
    }
    setMountedProjectEditorId(activeProjectEditorId);
  }, [props.activeProjectEditorId]);

  const editorProjectIds = useMemo(
    () =>
      Object.keys(editorsByProjectId).filter(
        (projectId) => editorsByProjectId[projectId as ProjectId] !== undefined,
      ) as ProjectId[],
    [editorsByProjectId],
  );
  const visibleProjectEditorId = useMemo(() => {
    if (!mountedProjectEditorId) {
      return null;
    }
    return editorProjectIds.includes(mountedProjectEditorId) ? mountedProjectEditorId : null;
  }, [editorProjectIds, mountedProjectEditorId]);

  if (!visibleProjectEditorId) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 min-h-0 min-w-0 overflow-hidden",
        !props.activeProjectEditorId && "pointer-events-none",
      )}
    >
      <div
        aria-hidden={visibleProjectEditorId !== props.activeProjectEditorId}
        className={cn(
          "absolute inset-0 min-h-0 min-w-0 overflow-hidden",
          visibleProjectEditorId !== props.activeProjectEditorId && "pointer-events-none opacity-0",
        )}
      >
        <ProjectEditorView projectId={visibleProjectEditorId} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_chat")({
  component: ChatRouteLayout,
});
