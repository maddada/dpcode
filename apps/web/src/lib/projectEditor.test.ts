import { describe, expect, it } from "vitest";
import { ProjectId, ThreadId } from "@t3tools/contracts";

import {
  isProjectEditorTargetCwdAllowed,
  resolveMatchingEditorBackingThread,
  resolveProjectEditorSessionTargetCwd,
} from "./projectEditor";
import { DEFAULT_INTERACTION_MODE, DEFAULT_RUNTIME_MODE, type Thread } from "../types";

function makeThread(
  id: string,
  overrides?: Partial<
    Pick<Thread, "createdAt" | "lastVisitedAt" | "projectId" | "updatedAt" | "worktreePath">
  >,
): Thread {
  return {
    id: id as ThreadId,
    codexThreadId: null,
    projectId: overrides?.projectId ?? ("project-1" as ProjectId),
    title: id,
    modelSelection: {
      provider: "codex",
      model: "gpt-5-codex",
    },
    runtimeMode: DEFAULT_RUNTIME_MODE,
    interactionMode: DEFAULT_INTERACTION_MODE,
    session: null,
    messages: [],
    proposedPlans: [],
    error: null,
    createdAt: overrides?.createdAt ?? "2026-04-09T10:00:00.000Z",
    updatedAt: overrides?.updatedAt ?? "2026-04-09T10:00:00.000Z",
    latestTurn: null,
    lastVisitedAt: overrides?.lastVisitedAt,
    turnDiffSummaries: [],
    activities: [],
    branch: null,
    worktreePath: overrides?.worktreePath ?? null,
  } satisfies Thread;
}

describe("isProjectEditorTargetCwdAllowed", () => {
  it("allows the project root", () => {
    expect(
      isProjectEditorTargetCwdAllowed({
        projectCwd: "/repo",
        projectThreads: [],
        targetCwd: "/repo",
      }),
    ).toBe(true);
  });

  it("allows known worktree paths and rejects stale ones", () => {
    const projectThreads = [
      makeThread("worktree-thread", { worktreePath: "/repo/.worktrees/feature-a" }),
    ];

    expect(
      isProjectEditorTargetCwdAllowed({
        projectCwd: "/repo",
        projectThreads,
        targetCwd: "/repo/.worktrees/feature-a",
      }),
    ).toBe(true);
    expect(
      isProjectEditorTargetCwdAllowed({
        projectCwd: "/repo",
        projectThreads,
        targetCwd: "/repo/.worktrees/deleted-branch",
      }),
    ).toBe(false);
  });
});

describe("resolveProjectEditorSessionTargetCwd", () => {
  it("prefers an active worktree thread", () => {
    const activeThread = makeThread("active", { worktreePath: "/repo/.worktrees/feature-a" });

    expect(
      resolveProjectEditorSessionTargetCwd({
        projectCwd: "/repo",
        projectThreads: [activeThread],
        activeThread,
        existingTargetCwd: "/repo",
      }),
    ).toBe("/repo/.worktrees/feature-a");
  });

  it("drops a stale persisted target and falls back to the latest live project thread", () => {
    const latestWorktreeThread = makeThread("latest", {
      worktreePath: "/repo/.worktrees/feature-b",
      lastVisitedAt: "2026-04-09T10:05:00.000Z",
    });

    expect(
      resolveProjectEditorSessionTargetCwd({
        projectCwd: "/repo",
        projectThreads: [latestWorktreeThread],
        activeThread: null,
        existingTargetCwd: "/repo/.worktrees/deleted-branch",
      }),
    ).toBe("/repo/.worktrees/feature-b");
  });

  it("falls back to the project root when there is no valid live target", () => {
    expect(
      resolveProjectEditorSessionTargetCwd({
        projectCwd: "/repo",
        projectThreads: [],
        activeThread: null,
        existingTargetCwd: "/repo/.worktrees/deleted-branch",
      }),
    ).toBe("/repo");
  });
});

describe("resolveMatchingEditorBackingThread", () => {
  it("returns the preferred matching thread when it still matches the target cwd", () => {
    const preferredThread = makeThread("preferred", { worktreePath: "/repo/.worktrees/feature-a" });
    const newerThread = makeThread("newer", {
      worktreePath: "/repo/.worktrees/feature-a",
      lastVisitedAt: "2026-04-09T10:05:00.000Z",
    });

    expect(
      resolveMatchingEditorBackingThread({
        projectCwd: "/repo",
        targetCwd: "/repo/.worktrees/feature-a",
        projectThreads: [newerThread, preferredThread],
        preferredThreadId: preferredThread.id,
      })?.id,
    ).toBe(preferredThread.id);
  });

  it("ignores a stale preferred thread and returns the newest matching thread", () => {
    const stalePreferredThread = makeThread("preferred", { worktreePath: null });
    const matchingThread = makeThread("matching", {
      worktreePath: "/repo/.worktrees/feature-a",
      lastVisitedAt: "2026-04-09T10:05:00.000Z",
    });
    const olderMatchingThread = makeThread("older-matching", {
      worktreePath: "/repo/.worktrees/feature-a",
      lastVisitedAt: "2026-04-09T10:01:00.000Z",
    });

    expect(
      resolveMatchingEditorBackingThread({
        projectCwd: "/repo",
        targetCwd: "/repo/.worktrees/feature-a",
        projectThreads: [olderMatchingThread, matchingThread, stalePreferredThread],
        preferredThreadId: stalePreferredThread.id,
      })?.id,
    ).toBe(matchingThread.id);
  });
});
