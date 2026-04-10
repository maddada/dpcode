import { type ProjectId, type ThreadId } from "@t3tools/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ProjectEditorEntry = {
  projectId: ProjectId;
  targetCwd?: string | null;
  backingThreadId: ThreadId | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectEditorStoreState = {
  editorsByProjectId: Record<ProjectId, ProjectEditorEntry | undefined>;
  ensureEditor: (projectId: ProjectId, targetCwd?: string | null) => void;
  setEditorBackingThreadId: (projectId: ProjectId, threadId: ThreadId | null) => void;
  deleteEditor: (projectId: ProjectId) => void;
};

const PROJECT_EDITOR_STORE_STORAGE_KEY = "t3code:project-editors:v1";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizePath(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function stripTransientTargetCwd(
  editorsByProjectId: Record<ProjectId, ProjectEditorEntry | undefined>,
): Record<ProjectId, ProjectEditorEntry | undefined> {
  return Object.fromEntries(
    Object.entries(editorsByProjectId).map(([projectId, entry]) => [
      projectId,
      entry
        ? {
            ...entry,
            targetCwd: undefined,
          }
        : undefined,
    ]),
  ) as Record<ProjectId, ProjectEditorEntry | undefined>;
}

export function projectEditorTerminalThreadId(projectId: ProjectId): ThreadId {
  return `project-editor:${projectId}` as ThreadId;
}

export const useProjectEditorStore = create<ProjectEditorStoreState>()(
  persist(
    (set) => ({
      editorsByProjectId: {},
      ensureEditor: (projectId, targetCwd) =>
        set((state) => {
          const existing = state.editorsByProjectId[projectId];
          if (existing) {
            const normalizedTargetCwd = normalizePath(targetCwd);
            if (normalizedTargetCwd === null || existing.targetCwd === normalizedTargetCwd) {
              return state;
            }
            return {
              editorsByProjectId: {
                ...state.editorsByProjectId,
                [projectId]: {
                  ...existing,
                  targetCwd: normalizedTargetCwd,
                  updatedAt: nowIso(),
                },
              },
            };
          }

          const createdAt = nowIso();
          return {
            editorsByProjectId: {
              ...state.editorsByProjectId,
              [projectId]: {
                projectId,
                targetCwd: normalizePath(targetCwd),
                backingThreadId: null,
                createdAt,
                updatedAt: createdAt,
              },
            },
          };
        }),
      setEditorBackingThreadId: (projectId, threadId) =>
        set((state) => {
          const existing = state.editorsByProjectId[projectId];
          if (!existing || existing.backingThreadId === threadId) {
            return state;
          }

          return {
            editorsByProjectId: {
              ...state.editorsByProjectId,
              [projectId]: {
                ...existing,
                backingThreadId: threadId,
                updatedAt: nowIso(),
              },
            },
          };
        }),
      deleteEditor: (projectId) =>
        set((state) => {
          if (!(projectId in state.editorsByProjectId)) {
            return state;
          }

          const { [projectId]: _deleted, ...rest } = state.editorsByProjectId;
          return { editorsByProjectId: rest };
        }),
    }),
    {
      name: PROJECT_EDITOR_STORE_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const candidate = persistedState as
          | { editorsByProjectId?: Record<ProjectId, ProjectEditorEntry | undefined> }
          | undefined;
        return {
          editorsByProjectId: stripTransientTargetCwd(candidate?.editorsByProjectId ?? {}),
        };
      },
      partialize: (state) => ({
        editorsByProjectId: stripTransientTargetCwd(state.editorsByProjectId),
      }),
    },
  ),
);
