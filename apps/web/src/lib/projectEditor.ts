import { type ProjectId, type ThreadId } from "@t3tools/contracts";

import { type Project, type Thread } from "~/types";

function normalizeProjectEditorTargetCwd(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function threadMatchesTargetCwd(thread: Thread, projectCwd: string, targetCwd: string): boolean {
  if (targetCwd !== projectCwd) {
    return thread.worktreePath === targetCwd;
  }

  return thread.worktreePath === null;
}

function threadSortTimestamp(thread: Thread): number {
  return (
    Date.parse(thread.lastVisitedAt ?? thread.updatedAt ?? thread.createdAt) ||
    Date.parse(thread.updatedAt ?? thread.createdAt) ||
    Date.parse(thread.createdAt) ||
    0
  );
}

function sortThreadsByRecency(threads: readonly Thread[]): Thread[] {
  return [...threads].toSorted(
    (left, right) => threadSortTimestamp(right) - threadSortTimestamp(left),
  );
}

export function resolveLatestVisitedProjectId(input: {
  activeProjectId?: ProjectId | null;
  projects: readonly Project[];
  threads: readonly Thread[];
}): ProjectId | null {
  if (input.activeProjectId) {
    return input.activeProjectId;
  }

  const latestThread = [...input.threads].toSorted(
    (left, right) => threadSortTimestamp(right) - threadSortTimestamp(left),
  )[0];
  return latestThread?.projectId ?? input.projects[0]?.id ?? null;
}

export function resolveLatestProjectThread(
  projectId: ProjectId,
  threads: readonly Thread[],
): Thread | null {
  return (
    sortThreadsByRecency(threads.filter((thread) => thread.projectId === projectId))[0] ?? null
  );
}

export function resolveLatestTerminalThread(
  projectThreads: readonly Thread[],
  terminalEntryPointThreadIds: ReadonlySet<ThreadId>,
): Thread | null {
  return (
    sortThreadsByRecency(
      projectThreads.filter((thread) => terminalEntryPointThreadIds.has(thread.id)),
    )[0] ?? null
  );
}

export function resolveProjectEditorTargetCwd(input: {
  projectCwd: string;
  activeThread: Thread | null;
  latestThread: Thread | null;
  existingTargetCwd?: string | null;
}): string {
  if (input.activeThread?.worktreePath) {
    return input.activeThread.worktreePath;
  }
  if (input.latestThread?.worktreePath) {
    return input.latestThread.worktreePath;
  }
  return input.existingTargetCwd?.trim() || input.projectCwd;
}

export function isProjectEditorTargetCwdAllowed(input: {
  projectCwd: string;
  projectThreads: readonly Thread[];
  targetCwd: string | null | undefined;
}): boolean {
  const normalizedTargetCwd = normalizeProjectEditorTargetCwd(input.targetCwd);
  if (!normalizedTargetCwd) {
    return false;
  }
  if (normalizedTargetCwd === input.projectCwd) {
    return true;
  }
  return input.projectThreads.some((thread) => thread.worktreePath === normalizedTargetCwd);
}

export function resolveProjectEditorSessionTargetCwd(input: {
  projectCwd: string;
  projectThreads: readonly Thread[];
  activeThread: Thread | null;
  existingTargetCwd?: string | null;
}): string {
  const existingTargetCwd = isProjectEditorTargetCwdAllowed({
    projectCwd: input.projectCwd,
    projectThreads: input.projectThreads,
    targetCwd: input.existingTargetCwd,
  })
    ? normalizeProjectEditorTargetCwd(input.existingTargetCwd)
    : null;
  const latestThread = sortThreadsByRecency(input.projectThreads)[0] ?? null;
  return resolveProjectEditorTargetCwd({
    projectCwd: input.projectCwd,
    activeThread: input.activeThread,
    latestThread,
    existingTargetCwd,
  });
}

export function resolveMatchingEditorBackingThread(input: {
  projectCwd: string;
  targetCwd: string;
  projectThreads: readonly Thread[];
  preferredThreadId?: ThreadId | null;
}): Thread | null {
  const preferredThread =
    input.preferredThreadId !== null && input.preferredThreadId !== undefined
      ? (input.projectThreads.find((thread) => thread.id === input.preferredThreadId) ?? null)
      : null;
  if (
    preferredThread &&
    threadMatchesTargetCwd(preferredThread, input.projectCwd, input.targetCwd)
  ) {
    return preferredThread;
  }

  return (
    sortThreadsByRecency(
      input.projectThreads.filter((thread) =>
        threadMatchesTargetCwd(thread, input.projectCwd, input.targetCwd),
      ),
    )[0] ?? null
  );
}
