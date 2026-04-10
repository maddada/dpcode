import { type ProjectId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import {
  isProjectEditorTargetCwdAllowed,
  resolveLatestTerminalThread,
  resolveLatestVisitedProjectId,
  resolveProjectEditorSessionTargetCwd,
} from "~/lib/projectEditor";
import { resolveThreadEnvironmentMode } from "~/lib/threadEnvironment";
import { useProjectEditorStore } from "~/projectEditorStore";
import { selectThreadTerminalState, useTerminalStateStore } from "~/terminalStateStore";
import { useStore } from "~/store";

export function useProjectEditorActions() {
  const navigate = useNavigate();
  const projects = useStore((store) => store.projects);
  const threads = useStore((store) => store.threads);
  const terminalStateByThreadId = useTerminalStateStore((store) => store.terminalStateByThreadId);
  const openTerminalThreadPage = useTerminalStateStore((store) => store.openTerminalThreadPage);
  const ensureEditor = useProjectEditorStore((store) => store.ensureEditor);
  const editorEntriesByProjectId = useProjectEditorStore((store) => store.editorsByProjectId);
  const { activeProjectId, activeThread, activeDraftThread, handleNewThread } =
    useHandleNewThread();

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

  const resolveFallbackProjectId = useCallback(() => {
    return resolveLatestVisitedProjectId({
      activeProjectId,
      projects,
      threads,
    });
  }, [activeProjectId, projects, threads]);

  const openProjectEditor = useCallback(
    async (projectId: ProjectId, options?: { targetCwd?: string | null }) => {
      const project = projects.find((candidate) => candidate.id === projectId);
      if (!project) {
        return;
      }

      const projectThreads = threads.filter((thread) => thread.projectId === projectId);
      const activeProjectThread = activeThread?.projectId === projectId ? activeThread : null;
      const existingEditorEntry = editorEntriesByProjectId[projectId];
      const requestedTargetCwd = options?.targetCwd?.trim() || null;
      const targetCwd =
        (requestedTargetCwd &&
        isProjectEditorTargetCwdAllowed({
          projectCwd: project.cwd,
          projectThreads,
          targetCwd: requestedTargetCwd,
        })
          ? requestedTargetCwd
          : null) ||
        resolveProjectEditorSessionTargetCwd({
          projectCwd: project.cwd,
          projectThreads,
          activeThread: activeProjectThread,
          existingTargetCwd: existingEditorEntry?.targetCwd ?? null,
        });

      ensureEditor(projectId, targetCwd);
      await navigate({
        to: "/project/$projectId/editor",
        params: { projectId },
      });
    },
    [activeThread, editorEntriesByProjectId, ensureEditor, navigate, projects, threads],
  );

  const openCurrentProjectEditor = useCallback(async () => {
    const projectId = resolveFallbackProjectId();
    if (!projectId) {
      return;
    }

    await openProjectEditor(projectId);
  }, [openProjectEditor, resolveFallbackProjectId]);

  const openProjectTerminal = useCallback(
    async (projectId: ProjectId) => {
      const existingTerminalThread = resolveLatestTerminalThread(
        threads.filter((thread) => thread.projectId === projectId),
        terminalEntryPointThreadIds,
      );
      if (existingTerminalThread) {
        openTerminalThreadPage(existingTerminalThread.id, { terminalOnly: true });
        await navigate({
          to: "/$threadId",
          params: { threadId: existingTerminalThread.id },
        });
        return;
      }

      const envMode =
        activeThread?.projectId === projectId
          ? resolveThreadEnvironmentMode({
              envMode: activeThread.envMode,
              worktreePath: activeThread.worktreePath,
            })
          : activeDraftThread?.projectId === projectId
            ? activeDraftThread.envMode
            : undefined;

      await handleNewThread(projectId, {
        entryPoint: "terminal",
        branch: activeThread?.projectId === projectId ? activeThread.branch : null,
        worktreePath: activeThread?.projectId === projectId ? activeThread.worktreePath : null,
        ...(envMode ? { envMode } : {}),
      });
    },
    [
      activeDraftThread,
      activeThread,
      handleNewThread,
      navigate,
      openTerminalThreadPage,
      terminalEntryPointThreadIds,
      threads,
    ],
  );

  const openCurrentProjectTerminal = useCallback(async () => {
    const projectId = resolveFallbackProjectId();
    if (!projectId) {
      return;
    }
    await openProjectTerminal(projectId);
  }, [openProjectTerminal, resolveFallbackProjectId]);

  return {
    openCurrentProjectEditor,
    openCurrentProjectTerminal,
    openProjectEditor,
    openProjectTerminal,
    resolveFallbackProjectId,
  };
}
