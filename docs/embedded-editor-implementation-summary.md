# Embedded Editor Implementation Summary

## Purpose

This document summarizes the current embedded editor implementation in DP Code so another agent can extend it without needing the full chat history.

The feature adds a project-scoped `Editor` surface to the normal thread UI. It is backed by a Coderaft runtime, shown inside the main chat area, and designed so editor settings, keybindings, and extensions are shared across projects.

## Final Architecture

### Product behavior

- Each project can have one durable `Editor` row in the left sidebar.
- The row is created on first open and persists until explicitly deleted.
- Opening the editor shows Coderaft embedded in the main content area.
- The editor is project-scoped, not thread-scoped.
- Browser and diff side panels are still supported from the editor surface.
- Terminal support is reused from the project terminal flow rather than inventing a separate editor-only terminal model.

### Runtime model

- The embedded editor is **not** served directly from the Bun server process.
- Instead, the server spawns a dedicated **Node child process** per project editor session.
- Each child process starts Coderaft/code-server and binds to a random localhost port.
- The web app iframe points directly at that child process URL.

This is the key working design decision. Earlier attempts to route Coderaft through the Bun server were not reliable enough, especially around WebSocket upgrades.

### Shared editor state

- Coderaft `user-data-dir`
- Coderaft `extensions-dir`
- Coderaft `extensions-download-dir`

These are shared under the DP Code server state directory, so all embedded editors reuse the same settings, hotkeys, and extensions.

### Per-project isolation

- Runtime process is per project.
- Active session URL is per project.
- Editor row presence is per project.
- Backing thread selection is per project.

## Why The Node Subprocess Exists

Coderaft works correctly when hosted by a small plain Node HTTP server that passes upgrade traffic directly into its handler.

The important implementation detail is in the child runtime process:

- `socket.resume()`
- `handler.handleUpgrade(req, socket)`

Running that inside a plain Node child process fixed the white-screen and stalled WebSocket handshake problems that appeared when trying to proxy or host the runtime directly under Bun.

## State Model

### Server-side

The server keeps an in-memory runtime manager:

- one session per `projectId`
- cached by project id and current `cwd`
- automatically disposed on server shutdown
- automatically evicted if the child process exits unexpectedly

Important property:

- A dead child process is no longer treated as a valid cached session.

### Client-side

The client persists only durable editor row state:

- editor row existence per project
- backing thread id
- timestamps

Important property:

- `targetCwd` is **not** durably persisted anymore.

That was a deliberate cleanup. Persisting the target cwd caused stale worktree paths to survive reloads and wedge the editor into invalid states. The current target cwd is derived from live project/thread state instead.

## Target CWD Resolution

The editor target is derived using shared logic in `apps/web/src/lib/projectEditor.ts`.

Current rules:

1. If there is an active worktree thread for the project, prefer that worktree.
2. Otherwise prefer the most recent valid project thread/worktree.
3. Otherwise fall back to the project root.
4. Any requested or remembered target cwd must be validated against the live project root or a live worktree thread.

This logic now powers:

- opening the editor from header/sidebar actions
- resolving the active embedded editor session cwd
- selecting a matching backing thread
- selecting the latest project terminal thread

## Browser And Diff Behavior

The editor surface still uses a real thread id for browser and diff side panels.

Rules:

- If there is already a matching thread for the editor target cwd, reuse it.
- If not, create a visible backing thread named `Editor context`.
- If the editor is targeting a worktree, the fallback backing thread is created with that `worktreePath`.

This last rule matters a lot. Earlier behavior created the fallback backing thread at the project root, which caused diff/browser behavior to drift away from the actual editor target.

## Main Files

### Server

- [apps/server/src/projectEditorRuntime.ts](/Users/madda/dev/_custom/dpcode-mod/apps/server/src/projectEditorRuntime.ts)
  - Starts and manages per-project editor runtimes.
  - Spawns the Node child process.
  - Reuses shared Coderaft profile directories.
  - Evicts cached sessions when a child process exits.

- [apps/server/src/projectEditorRuntimeProcess.mjs](/Users/madda/dev/_custom/dpcode-mod/apps/server/src/projectEditorRuntimeProcess.mjs)
  - Plain Node host for Coderaft.
  - Creates the HTTP server and WebSocket upgrade path.
  - Emits a ready message back to the parent with the bound port.

- [apps/server/src/wsServer.ts](/Users/madda/dev/_custom/dpcode-mod/apps/server/src/wsServer.ts)
  - Wires the editor session APIs into the existing WS server.
  - Validates that requested editor cwd matches the project root or a known worktree.
  - Disposes all editor runtimes on server shutdown.

### Shared contracts

- [packages/contracts/src/editor.ts](/Users/madda/dev/_custom/dpcode-mod/packages/contracts/src/editor.ts)
  - `ProjectEditorEnsureSessionInput`
  - `ProjectEditorDisposeSessionInput`
  - `ProjectEditorSession`

- [packages/contracts/src/ipc.ts](/Users/madda/dev/_custom/dpcode-mod/packages/contracts/src/ipc.ts)
  - Native API shape for client editor calls.

- [packages/contracts/src/ws.ts](/Users/madda/dev/_custom/dpcode-mod/packages/contracts/src/ws.ts)
  - WS methods for ensuring and disposing editor sessions.

### Web client

- [apps/web/src/lib/projectEditor.ts](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/lib/projectEditor.ts)
  - Shared editor targeting and backing-thread selection rules.

- [apps/web/src/projectEditorStore.ts](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/projectEditorStore.ts)
  - Persistent editor row state.
  - Does not durably persist `targetCwd`.

- [apps/web/src/hooks/useProjectEditorActions.ts](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/hooks/useProjectEditorActions.ts)
  - Entry points for opening the current project editor or terminal.
  - Validates requested target cwd before using it.

- [apps/web/src/components/project-editor/ProjectEditorView.tsx](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/components/project-editor/ProjectEditorView.tsx)
  - Main embedded editor screen.
  - Derives the target cwd from live project state.
  - Ensures the editor session.
  - Creates/reuses backing threads and terminal threads.

- [apps/web/src/components/project-editor/ProjectEditorHeader.tsx](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/components/project-editor/ProjectEditorHeader.tsx)
  - Header controls for open-in-editor, terminal, browser, and diff.

- [apps/web/src/components/Sidebar.tsx](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/components/Sidebar.tsx)
  - Adds the project `Editor` action and durable `Editor` row.

- [apps/web/src/components/chat/ChatHeader.tsx](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/components/chat/ChatHeader.tsx)
  - Adds the project editor button in the normal thread header.

- [apps/web/src/routes/\_chat.project.$projectId.editor.tsx](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/routes/_chat.project.$projectId.editor.tsx)
  - Editor route.

## Key Invariants

- One embedded editor runtime per project.
- Shared Coderaft profile data across projects.
- No durable persisted target cwd.
- Fallback backing threads must preserve worktree context.
- Dead editor child processes must not remain cached as healthy sessions.
- The editor row is a UI concept, not a real orchestration thread.

## Known Caveats

- The embedded iframe still carries the known sandbox lint warning because Coderaft needs both script execution and same-origin access to function correctly.
- The sidebar/editor flow is functionally correct, but the UI code is still more coupled than ideal. A future cleanup could extract a dedicated project-editor controller hook and sidebar row builder.
- The implementation currently references the local Coderaft checkout at:
  - `/Users/madda/dev/_custom/coderaft`

## Tests Added

- [apps/web/src/lib/projectEditor.test.ts](/Users/madda/dev/_custom/dpcode-mod/apps/web/src/lib/projectEditor.test.ts)

Coverage includes:

- valid vs stale editor target cwd selection
- deriving the current editor target from live project/worktree state
- preferring a valid matching backing thread
- ignoring stale preferred backing thread ids

## Suggested Next Steps

Good follow-up directions for another agent:

1. Extract the editor-thread creation logic in `ProjectEditorView` into a reusable helper or hook.
2. Extract project sidebar entry building so the `Editor` row ordering logic is easier to maintain.
3. Add server-side tests around runtime-manager crash recovery.
4. Add UI/integration tests for:
   - opening the editor from a worktree-backed thread
   - deleting the editor row
   - reopening after a server restart
   - browser/diff behavior when no matching backing thread exists
5. Consider whether browser and diff panels should eventually be driven by explicit `cwd` instead of a backing thread abstraction.

## Validation Status

Most recent verification after the architectural cleanup:

- `bun --filter=@t3tools/web run test src/lib/projectEditor.test.ts`
- `bun fmt`
- `bun lint`
- `bun typecheck`

`bun lint` passes with the repo's existing warnings, including the known iframe sandbox warning.
