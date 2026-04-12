import { DEFAULT_MODEL_BY_PROVIDER, type ProjectId, type ThreadId } from "@t3tools/contracts";
import { type TerminalActivityState } from "@t3tools/shared/terminalThreads";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";

import BrowserPanel from "~/components/BrowserPanel";
import DiffPanel from "~/components/DiffPanel";
import ThreadTerminalDrawer from "~/components/ThreadTerminalDrawer";
import { SidebarInset } from "~/components/ui/sidebar";
import { serverConfigQueryOptions } from "~/lib/serverReactQuery";
import { gitBranchesQueryOptions } from "~/lib/gitReactQuery";
import {
  type DiffRouteSearch,
  parseDiffRouteSearch,
  stripDiffSearchParams,
} from "~/diffRouteSearch";
import { shortcutLabelForCommand } from "~/keybindings";
import { newCommandId, newThreadId } from "~/lib/utils";
import { readNativeApi } from "~/nativeApi";
import { useProjectEditorStore, projectEditorTerminalThreadId } from "~/projectEditorStore";
import { selectThreadTerminalState, useTerminalStateStore } from "~/terminalStateStore";
import { useStore } from "~/store";
import {
  resolveLatestTerminalThread,
  resolveProjectEditorSessionTargetCwd,
  resolveMatchingEditorBackingThread,
} from "~/lib/projectEditor";
import { ProjectEditorHeader } from "./ProjectEditorHeader";

function randomTerminalId(): string {
  if (typeof crypto.randomUUID === "function") {
    return `terminal-${crypto.randomUUID()}`;
  }
  return `terminal-${Math.random().toString(36).slice(2, 10)}`;
}

export function ProjectEditorView({ projectId }: { projectId: ProjectId }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false, select: (value) => parseDiffRouteSearch(value) });
  const projects = useStore((store) => store.projects);
  const allThreads = useStore((store) => store.threads);
  const project = useMemo(
    () => projects.find((entry) => entry.id === projectId),
    [projectId, projects],
  );
  const threads = useMemo(
    () => allThreads.filter((thread) => thread.projectId === projectId),
    [allThreads, projectId],
  );
  const editorEntry = useProjectEditorStore((store) => store.editorsByProjectId[projectId] ?? null);
  const ensureEditor = useProjectEditorStore((store) => store.ensureEditor);
  const setEditorBackingThreadId = useProjectEditorStore((store) => store.setEditorBackingThreadId);
  const terminalStateByThreadId = useTerminalStateStore((state) => state.terminalStateByThreadId);
  const targetCwd = useMemo(() => {
    if (!project) {
      return null;
    }
    return resolveProjectEditorSessionTargetCwd({
      projectCwd: project.cwd,
      projectThreads: threads,
      activeThread: null,
      existingTargetCwd: editorEntry?.targetCwd ?? null,
    });
  }, [editorEntry?.targetCwd, project, threads]);
  const backingThreadId = editorEntry?.backingThreadId ?? null;
  const fallbackTerminalThreadId = useMemo(
    () => projectEditorTerminalThreadId(projectId),
    [projectId],
  );
  const terminalEntryPointThreadIds = useMemo(
    () =>
      new Set(
        threads
          .filter(
            (thread) =>
              selectThreadTerminalState(terminalStateByThreadId, thread.id).entryPoint ===
              "terminal",
          )
          .map((thread) => thread.id),
      ),
    [terminalStateByThreadId, threads],
  );
  const terminalThread = useMemo(
    () => resolveLatestTerminalThread(threads, terminalEntryPointThreadIds),
    [terminalEntryPointThreadIds, threads],
  );
  const terminalScopeThreadId = terminalThread?.id ?? fallbackTerminalThreadId;
  const matchingBackingThread = useMemo(() => {
    if (!project || !targetCwd) {
      return null;
    }

    return resolveMatchingEditorBackingThread({
      projectCwd: project.cwd,
      targetCwd,
      projectThreads: threads,
      preferredThreadId: backingThreadId,
    });
  }, [backingThreadId, project, targetCwd, threads]);
  const resolvedBackingThreadId = matchingBackingThread?.id ?? null;
  const terminalState = useTerminalStateStore((state) =>
    selectThreadTerminalState(state.terminalStateByThreadId, terminalScopeThreadId),
  );
  const setTerminalOpen = useTerminalStateStore((store) => store.setTerminalOpen);
  const setTerminalPresentationMode = useTerminalStateStore(
    (store) => store.setTerminalPresentationMode,
  );
  const setTerminalHeight = useTerminalStateStore((store) => store.setTerminalHeight);
  const setTerminalMetadata = useTerminalStateStore((store) => store.setTerminalMetadata);
  const setTerminalActivity = useTerminalStateStore((store) => store.setTerminalActivity);
  const splitTerminalRight = useTerminalStateStore((store) => store.splitTerminalRight);
  const splitTerminalDown = useTerminalStateStore((store) => store.splitTerminalDown);
  const newTerminal = useTerminalStateStore((store) => store.newTerminal);
  const newTerminalTab = useTerminalStateStore((store) => store.newTerminalTab);
  const setActiveTerminal = useTerminalStateStore((store) => store.setActiveTerminal);
  const closeTerminalState = useTerminalStateStore((store) => store.closeTerminal);
  const closeTerminalGroup = useTerminalStateStore((store) => store.closeTerminalGroup);
  const resizeTerminalSplit = useTerminalStateStore((store) => store.resizeTerminalSplit);
  const serverConfigQuery = useQuery(serverConfigQueryOptions());
  const gitBranchesQuery = useQuery(gitBranchesQueryOptions(targetCwd));
  const editorSessionQueryKey = useMemo(
    () => ["project-editor", "session", projectId, targetCwd] as const,
    [projectId, targetCwd],
  );
  const editorSessionQuery = useQuery({
    queryKey: editorSessionQueryKey,
    queryFn: async () => {
      const api = readNativeApi();
      if (!api || !targetCwd) {
        throw new Error("Editor session is unavailable.");
      }
      return api.editor.ensureSession({ projectId, cwd: targetCwd });
    },
    enabled: project !== undefined && targetCwd !== null,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const availableEditors = serverConfigQuery.data?.availableEditors ?? [];
  const keybindings = serverConfigQuery.data?.keybindings ?? [];
  const terminalToggleShortcutLabel = shortcutLabelForCommand(keybindings, "terminal.toggle");
  const browserToggleShortcutLabel = shortcutLabelForCommand(keybindings, "browser.toggle");
  const diffToggleShortcutLabel = shortcutLabelForCommand(keybindings, "diff.toggle");
  const panel = search.panel ?? null;
  const browserOpen = panel === "browser";
  const diffOpen = panel === "diff";

  useEffect(() => {
    if (!project || !targetCwd) {
      return;
    }
    ensureEditor(project.id, targetCwd);
  }, [ensureEditor, project, targetCwd]);

  useEffect(() => {
    if (!matchingBackingThread || matchingBackingThread.id === backingThreadId) {
      return;
    }
    setEditorBackingThreadId(projectId, matchingBackingThread.id);
  }, [backingThreadId, matchingBackingThread, projectId, setEditorBackingThreadId]);

  const createProjectSupportThread = useCallback(
    async (input: { threadId: ThreadId; title: string; worktreePath: string | null }) => {
      const api = readNativeApi();
      if (!api || !project) {
        return false;
      }

      await api.orchestration.dispatchCommand({
        type: "thread.create",
        commandId: newCommandId(),
        threadId: input.threadId,
        projectId,
        title: input.title,
        modelSelection: project.defaultModelSelection ?? {
          provider: "codex",
          model: DEFAULT_MODEL_BY_PROVIDER.codex,
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        envMode: input.worktreePath ? "worktree" : "local",
        branch: null,
        worktreePath: input.worktreePath,
        createdAt: new Date().toISOString(),
      });
      return true;
    },
    [project, projectId],
  );

  const ensureBackingThread = useCallback(async (): Promise<ThreadId | null> => {
    if (!project || !targetCwd) {
      return null;
    }

    const matchingThread = resolveMatchingEditorBackingThread({
      projectCwd: project.cwd,
      targetCwd,
      projectThreads: threads,
      preferredThreadId: backingThreadId,
    });
    if (matchingThread) {
      setEditorBackingThreadId(projectId, matchingThread.id);
      return matchingThread.id;
    }

    const worktreePath = targetCwd !== project.cwd ? targetCwd : null;
    const threadId = newThreadId();
    const created = await createProjectSupportThread({
      threadId,
      title: "Editor context",
      worktreePath,
    });
    if (!created) {
      return null;
    }
    setEditorBackingThreadId(projectId, threadId);
    return threadId;
  }, [
    backingThreadId,
    createProjectSupportThread,
    project,
    projectId,
    setEditorBackingThreadId,
    targetCwd,
    threads,
  ]);

  const updatePanelSearch = useCallback(
    async (nextPanel: DiffRouteSearch["panel"]) => {
      let ensuredThreadId: ThreadId | null = null;
      if (nextPanel === "browser" || nextPanel === "diff") {
        ensuredThreadId = await ensureBackingThread();
        if (!ensuredThreadId) {
          return;
        }
      }

      await navigate({
        to: "/project/$projectId/editor",
        params: { projectId },
        search: (previous) => {
          const rest = stripDiffSearchParams(previous);
          if (!nextPanel) {
            return rest;
          }
          if (nextPanel === "browser") {
            return { ...rest, panel: "browser" };
          }
          return { ...rest, panel: "diff", diff: "1" };
        },
      });
    },
    [ensureBackingThread, navigate, projectId],
  );

  const ensureTerminalThreadId = useCallback(async (): Promise<ThreadId | null> => {
    if (!project) {
      return null;
    }

    if (terminalThread) {
      return terminalThread.id;
    }

    const threadId = newThreadId();
    const worktreePath = targetCwd && targetCwd !== project.cwd ? targetCwd : null;
    const created = await createProjectSupportThread({
      threadId,
      title: "New terminal",
      worktreePath,
    });
    if (!created) {
      return null;
    }
    useTerminalStateStore.getState().openTerminalThreadPage(threadId, { terminalOnly: true });
    return threadId;
  }, [createProjectSupportThread, project, targetCwd, terminalThread]);

  const toggleTerminal = useCallback(async () => {
    const threadId = await ensureTerminalThreadId();
    if (!threadId) {
      return;
    }

    const nextTerminalState = selectThreadTerminalState(
      useTerminalStateStore.getState().terminalStateByThreadId,
      threadId,
    );
    if (!nextTerminalState.terminalOpen) {
      setTerminalPresentationMode(threadId, "drawer");
    }
    setTerminalOpen(threadId, !nextTerminalState.terminalOpen);
  }, [ensureTerminalThreadId, setTerminalOpen, setTerminalPresentationMode]);

  const closeEditorTerminal = useCallback(
    (terminalId: string) => {
      const api = readNativeApi();
      const fallbackExitWrite = () =>
        api?.terminal
          .write({ threadId: terminalScopeThreadId, terminalId, data: "exit\n" })
          .catch(() => undefined);

      if (api && typeof api.terminal.close === "function") {
        void api.terminal
          .close({
            threadId: terminalScopeThreadId,
            terminalId,
            deleteHistory: true,
          })
          .catch(() => fallbackExitWrite());
      } else {
        void fallbackExitWrite();
      }

      closeTerminalState(terminalScopeThreadId, terminalId);
    },
    [closeTerminalState, terminalScopeThreadId],
  );

  const terminalDrawerProps = useMemo(
    () => ({
      threadId: terminalScopeThreadId,
      cwd: targetCwd ?? "",
      height: terminalState.terminalHeight,
      terminalIds: terminalState.terminalIds,
      terminalLabelsById: terminalState.terminalLabelsById,
      terminalTitleOverridesById: terminalState.terminalTitleOverridesById,
      terminalCliKindsById: terminalState.terminalCliKindsById,
      terminalAttentionStatesById: terminalState.terminalAttentionStatesById,
      runningTerminalIds: terminalState.runningTerminalIds,
      activeTerminalId: terminalState.activeTerminalId,
      terminalGroups: terminalState.terminalGroups,
      activeTerminalGroupId: terminalState.activeTerminalGroupId,
      focusRequestId: 0,
      onSplitTerminal: () => splitTerminalRight(terminalScopeThreadId, randomTerminalId()),
      onSplitTerminalDown: () => splitTerminalDown(terminalScopeThreadId, randomTerminalId()),
      onNewTerminal: () => newTerminal(terminalScopeThreadId, randomTerminalId()),
      onNewTerminalTab: (targetTerminalId: string) =>
        newTerminalTab(terminalScopeThreadId, targetTerminalId, randomTerminalId()),
      onMoveTerminalToGroup: (terminalId: string) => newTerminal(terminalScopeThreadId, terminalId),
      onActiveTerminalChange: (terminalId: string) =>
        setActiveTerminal(terminalScopeThreadId, terminalId),
      onCloseTerminal: closeEditorTerminal,
      onCloseTerminalGroup: (groupId: string) => closeTerminalGroup(terminalScopeThreadId, groupId),
      onHeightChange: (height: number) => setTerminalHeight(terminalScopeThreadId, height),
      onResizeTerminalSplit: (groupId: string, splitId: string, weights: number[]) =>
        resizeTerminalSplit(terminalScopeThreadId, groupId, splitId, weights),
      onTerminalMetadataChange: (
        terminalId: string,
        metadata: { cliKind: "codex" | "claude" | null; label: string },
      ) => setTerminalMetadata(terminalScopeThreadId, terminalId, metadata),
      onTerminalActivityChange: (
        terminalId: string,
        activity: { agentState: TerminalActivityState | null; hasRunningSubprocess: boolean },
      ) => setTerminalActivity(terminalScopeThreadId, terminalId, activity),
      onAddTerminalContext: () => {},
    }),
    [
      closeTerminalGroup,
      closeEditorTerminal,
      newTerminal,
      newTerminalTab,
      resizeTerminalSplit,
      setActiveTerminal,
      setTerminalActivity,
      setTerminalHeight,
      setTerminalMetadata,
      splitTerminalDown,
      splitTerminalRight,
      terminalScopeThreadId,
      targetCwd,
      terminalState.activeTerminalGroupId,
      terminalState.activeTerminalId,
      terminalState.terminalAttentionStatesById,
      terminalState.runningTerminalIds,
      terminalState.terminalCliKindsById,
      terminalState.terminalGroups,
      terminalState.terminalHeight,
      terminalState.terminalIds,
      terminalState.terminalLabelsById,
      terminalState.terminalTitleOverridesById,
    ],
  );

  if (!project) {
    return null;
  }

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none rounded-none bg-[#151515] text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-border px-3 py-2 sm:px-5 sm:py-3">
            <ProjectEditorHeader
              availableEditors={availableEditors}
              browserOpen={browserOpen}
              browserToggleShortcutLabel={browserToggleShortcutLabel}
              diffOpen={diffOpen}
              diffToggleShortcutLabel={diffToggleShortcutLabel}
              isGitRepo={gitBranchesQuery.data?.isRepo ?? true}
              keybindings={keybindings}
              openInCwd={targetCwd}
              projectName={project.name}
              terminalOpen={terminalState.terminalOpen}
              terminalToggleShortcutLabel={terminalToggleShortcutLabel}
              onToggleBrowser={() => {
                void updatePanelSearch(browserOpen ? undefined : "browser");
              }}
              onToggleDiff={() => {
                void updatePanelSearch(diffOpen ? undefined : "diff");
              }}
              onToggleTerminal={toggleTerminal}
            />
          </header>
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#151515]">
            {editorSessionQuery.isPending ? (
              <div className="flex h-full items-center justify-center bg-[#151515] text-sm text-muted-foreground">
                Starting editor...
              </div>
            ) : editorSessionQuery.isError ? (
              <div className="flex h-full items-center justify-center bg-[#151515] px-6 text-center text-sm text-destructive">
                {editorSessionQuery.error instanceof Error
                  ? editorSessionQuery.error.message
                  : "Unable to start the editor."}
              </div>
            ) : (
              <iframe
                src={editorSessionQuery.data.path}
                className="h-full w-full border-0 bg-[#151515]"
                style={{ backgroundColor: "#151515" }}
                sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                title={`${project.name} Editor`}
              />
            )}
          </div>
        </div>
        {browserOpen && resolvedBackingThreadId ? (
          <div className="w-[min(40vw,30rem)] min-w-[22rem] max-w-[30rem] border-l border-border bg-card">
            <BrowserPanel
              mode="sidebar"
              threadId={resolvedBackingThreadId}
              onClosePanel={() => {
                void updatePanelSearch(undefined);
              }}
            />
          </div>
        ) : null}
        {diffOpen && resolvedBackingThreadId ? (
          <div className="w-[min(45vw,34rem)] min-w-[24rem] max-w-[34rem] border-l border-border bg-card">
            <DiffPanel mode="sidebar" threadId={resolvedBackingThreadId} />
          </div>
        ) : null}
      </div>
      {terminalState.terminalOpen ? (
        <ThreadTerminalDrawer
          key={terminalScopeThreadId}
          {...terminalDrawerProps}
          presentationMode="drawer"
        />
      ) : null}
    </SidebarInset>
  );
}
