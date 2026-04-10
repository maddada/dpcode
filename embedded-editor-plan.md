# Project-Scoped Embedded Editor via Coderaft

## Summary

- Add a new project-scoped Editor surface to the normal thread UI, not to the
  separate Workspace tab system.
- Editor is a durable non-AI special row under each project, created on first open,
  shown full-width in the right pane, and backed by a per-project coderaft runtime.
- All embedded editors share one coderaft user profile, so settings, keybindings,
  and extensions are shared across projects; each project still gets its own
  runtime and restored editor session state.
- The existing Workspace tab feature stays unchanged in v1.

## Implementation Changes

- Navigation and identity:
  - Add a dedicated route for the editor row, separate from /$threadId, using a
        project-based path such as /project/$projectId/editor.
  - Introduce a persisted project-editor state model keyed by projectId, not by
    orchestration thread id.
  - Store: row existence, last-opened timestamp, current editor target folder,
    live runtime/session metadata, and optional backing thread id.
  - Treat Editor as a durable UI entry only: no provider session, no message
    timeline, no model selection, no unread state, no rename.
- Sidebar and header UX:
  - Add Editor to each project’s hover action cluster beside New terminal and New
    thread.
  - Add an Editor button to the normal project thread header.
  - When created, show Editor as a special child row under the project only after
    first open.
  - Order project children as: Editor, New terminal, then regular chat threads.
  - Editor row supports open and delete only.
- Editor surface behavior:
  - Opening from a thread header targets that thread’s current folder context.
  - Opening from a project sidebar action targets that project’s most recent
    matching thread/worktree if one exists, else the base project root.
  - The editor row follows current thread/worktree only on explicit reopen/
    select; an already-open editor does not live-retarget in place.
  - Keep a slim T3 header above the iframe, but include project-level controls;
    omit AI-thread-only controls like handoff.
  - Keep browser and diff controls available on the editor row.
  - Allow the terminal drawer over the editor, but reuse the project’s single New
    terminal state rather than creating separate editor terminals.
- Server/runtime integration:
  - Add a server-side editor runtime manager that lazily creates one coderaft
    handler per project editor row and keeps it warm until app exit or editor-row
    deletion.
  - Mount coderaft behind the existing server under a dedicated internal path
    prefix and proxy both HTTP and upgrade traffic there.
  - Use shared coderaft profile directories under server state for user data,
    keybindings, settings, and extensions; keep per-project runtime instances
    separate.
  - Expose the minimum client-facing API needed to ensure/start an editor session
    and resolve its URL/status for a project.
  - Add local dependency wiring to use /Users/madda/dev/\_custom/coderaft from the
    server app.
- Browser, diff, and backing thread policy:
  - Prefer reusing the last matching normal chat thread in the same project,
    matching worktree when present.
  - If no matching normal thread exists, create a plain backing chat thread
    without a worktree and use it for browser/diff support.
  - That backing thread is visible as a normal thread in the project list.
  - Deleting the editor row does not delete the backing thread.
- Keybindings:
  - Keep chat.newTerminal as the “new terminal thread” action.
  - Add two new app-level commands for surface switching/creation: one for
    opening the project Editor row and one for opening the project terminal row.
  - These commands create the missing target row if needed.
  - When no project thread is active, they target the most recently visited
    project, falling back to the first project.

## Public Interfaces / Types

- Add a new persisted project-editor client model keyed by projectId.
- Add new server/editor contract types for editor session resolution/runtime state.
- Add two new keybinding commands for project editor/terminal surface switching.
- Extend sidebar/view-model logic to support a third project child kind: special
  editor row.
- Keep orchestration thread contracts unchanged for the editor row itself; it is

## Test Plan

- Web:
  - Sidebar shows Editor only after first open, orders it above New terminal, and
    deletes it without affecting normal threads.
    row.
  - Editor route renders full-width with app header, iframe, and shared terminal
    drawer behavior.
  - New surface-switch shortcuts create-or-switch correctly and use most-recent
    project fallback.
  - Worktree target resolution is correct for thread-header opens, project-action
    opens, and explicit reopen retargeting.
- Server:
  - Editor runtime manager creates one runtime per project, reuses it within the
    session, and disposes it on delete/shutdown.
  - Shared coderaft profile directories are reused across projects while runtime
    instances remain isolated.
  - Mounted editor HTTP and WebSocket upgrade traffic routes correctly through
    the main server.
- Integration:
  - Browser/diff on editor row reuse a matching thread when available, otherwise
    create a visible backing chat thread.
  - Existing Workspace tab routes and terminal-only workspace behavior remain
    unchanged.
  - Final verification pass runs bun fmt, bun lint, and bun typecheck.

## Assumptions

- Earlier workspace-page interpretations are superseded; v1 editor work happens
  only in the normal project/thread UI.
- Editor has a fixed label and is not renameable.
- The editor row is project-scoped, persists until explicitly deleted, and restores
  its previous coderaft session state when reopened.
- Shared editor state means shared settings, hotkeys, and extensions across all
  embedded editors.
