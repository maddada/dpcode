# Fork Modifications

This document summarizes the fork-specific improvements currently carried on
`main-2026-04-14-v0.0.22` on top of the latest fetched `upstream/main`.

Source range:

```text
upstream/main..main-2026-04-14-v0.0.22
```

## High-Level Summary

The fork adds a VSmux-focused embedded DP Code experience. The main themes are:

- Project-scoped embedded editor support, including server APIs, shared runtime
  contracts, a persistent web editor layer, project editor routing, and editor
  state management.
- VSmux embed integration, including bootstrap handling, embedded-mode UI
  behavior, active thread synchronization back to the host, and settings
  navigation that can return to the originating thread.
- Desktop/local build tooling improvements for local desktop installation and
  artifact copying.
- Chat and workspace flow refinements, including thread-first sidebar chrome,
  workspace redirect handling, rewind/checkpoint behavior, and diff panel
  close-key support.
- Follow-up fixes from the upstream sync, including websocket/server handling,
  route behavior, sidebar compatibility, and removing the broken empty-chat hero
  image.
- Latest upstream replay reconciliation, preserving the fork features on top of
  upstream `v0.0.24` and newer `upstream/main` changes.

## Improvements By Area

### Project Editor Runtime

Related commits:

- `c9c6324` `feat(server): add project editor session APIs and shared runtime manager`
- `a08ed55` `feat(web): add project-scoped embedded editor flow and route`

Changes:

- Added server-side project editor session support in
  `apps/server/src/projectEditorRuntime.ts`.
- Extended websocket, IPC, editor, and keybinding contracts so the web UI and
  server can coordinate project editor sessions.
- Added project editor routes and route-tree wiring for
  `/project/$projectId/editor`.
- Added the embedded project editor UI with a header, persistent editor view,
  focus detection, and project editor state store.
- Added web helpers and tests around project editor behavior.
- Added sidebar and chat header entry points for opening the current project in
  the embedded editor or terminal.

### VSmux Embed Integration

Related commits:

- `0b3f169` `feat(chat): add VSmux embed bootstrap and rewind mapping`
- `d2e5be7` `feat(settings): enhance VSmux embed settings navigation and add return thread ID management`
- `d6bc745` `feat(embed): sync active thread state back to VSmux`
- `2633f58` `fix: reconcile upstream sync follow-up issues`

Changes:

- Added `apps/web/src/vsmuxEmbed.ts` for detecting embedded mode, reading
  bootstrap data, remembering the VSmux return thread, and posting host updates.
- Adjusted chat routing and root route behavior for embedded usage.
- Added active thread synchronization so VSmux can track the currently selected
  DP Code thread.
- Made sidebar behavior embed-aware so the regular thread sidebar is hidden or
  disabled where it conflicts with the host shell.
- Added settings-page behavior for embedded mode, including a back action that
  returns to the remembered or bootstrapped thread.
- Reconciled upstream changes in server websocket handling and sidebar logic
  after replaying the fork commits.

### Chat, Rewind, And Workspace Flow

Related commits:

- `10f03ff` `feat(rewind): restore the nearest earlier checkpoint`
- `0b3f169` `feat(chat): add VSmux embed bootstrap and rewind mapping`
- `37dad3b` `fix(routes): hide workspace redirect helper from route scan`

Changes:

- Updated checkpoint rewind behavior to restore the nearest earlier checkpoint.
- Added regression coverage for checkpoint rewind behavior.
- Added chat rewind helpers and tests for mapping embedded/VSmux chat state.
- Added a workspace redirect helper and then moved it behind a route-ignored
  filename so TanStack Router does not generate an unintended route from it.
- Simplified workspace redirect routes to use the shared helper.

### Sidebar, Shell, And Settings UI

Related commits:

- `d69e198` `feat(shell): simplify thread-first sidebar chrome`
- `d2e5be7` `feat(settings): enhance VSmux embed settings navigation and add return thread ID management`
- `4c50499` `refactor(ChatEmptyStateHero): simplify layout by removing logo image`

Changes:

- Simplified the thread-first sidebar shell and reduced unnecessary chrome.
- Updated sidebar, plugin library, workspace, chat header, project editor, and
  settings styling to better fit the embedded host experience.
- Reworked the settings route into grouped sections with embed-aware navigation.
- Removed the empty-chat hero image that was broken in the DP Code empty chat
  view while keeping the "Let's build" text.

### Diff Panel And Keybindings

Related commit:

- `55cf0b5` `feat(diff-panel): add onClosePanel prop and keyboard shortcut for toggling diff panel`

Changes:

- Added a close callback to the diff panel shell.
- Added project editor wiring so the diff panel can be closed from the embedded
  editor flow.
- Added keybinding support for toggling the diff panel.
- Updated thread route handling to respect the new diff panel close behavior.

### Desktop Build And Local Install Tooling

Related commit:

- `7613ec2` `build(desktop): support local desktop install and dir artifact copying`

Changes:

- Added local desktop install support through
  `scripts/install-desktop-local.ts`.
- Added a `Makefile` shortcut and package script for local desktop installation.
- Updated desktop artifact building so directory artifacts can be copied into
  the expected local install location.
- Updated `.gitignore` for generated local desktop artifacts.

### Documentation

Related commits:

- `f5abc3a` `docs: add embedded editor and desktop debugging notes`
- `12887f4` `docs: remove literal merge marker example`

Changes:

- Added embedded editor implementation notes.
- Added desktop local install summary documentation.
- Added Electron debugging notes.
- Added the embedded editor implementation plan.
- Cleaned up a literal merge-marker example in the desktop install summary.

## Commit Inventory

The fork-specific commits currently applied on top of `upstream/main` are:

```text
46e5c3b1 feat(server): add project editor session APIs and shared runtime manager
b46ed75f feat(web): add project-scoped embedded editor flow and route
b0e3eaf1 build(desktop): support local desktop install and dir artifact copying
4ab8aa5b docs: add embedded editor and desktop debugging notes
991f5d91 feat(rewind): restore the nearest earlier checkpoint
2b030360 feat(chat): add VSmux embed bootstrap and rewind mapping
e08b1e34 feat(shell): simplify thread-first sidebar chrome
8e52e003 fix(routes): hide workspace redirect helper from route scan
601724b0 feat(settings): enhance VSmux embed settings navigation and add return thread ID management
99bbc730 feat(diff-panel): add onClosePanel prop and keyboard shortcut for toggling diff panel
bce63086 easfeat(embed): sync active thread state back to VSmux
8ffca06e docs: remove literal merge marker example
ca02ce2f fix: reconcile upstream sync follow-up issues
ee5d3473 refactor(ChatEmptyStateHero): simplify layout by removing logo image
077a705c fix: reconcile latest upstream replay
```
