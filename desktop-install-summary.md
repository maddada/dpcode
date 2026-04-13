# Desktop Build And Install Summary

## What We Did

This session covered two related tasks:

1. Building the Electron/macOS version of the app locally.
2. Creating a repeatable command that:
   - stops the currently running installed app,
   - rebuilds the app,
   - replaces the copy in `/Applications`,
   - launches the newly installed app.

## Initial Electron Build

We first traced the existing desktop packaging flow in the repo and confirmed that the project already had:

- an Electron app in `apps/desktop`,
- a release packaging script in `scripts/build-desktop-artifact.ts`,
- root package scripts like `dist:desktop:artifact` and `dist:desktop:dmg`.

### First Build Attempt

We ran the desktop artifact build:

```bash
bun run dist:desktop:artifact
```

That failed before packaging finished because the web app build inside the pipeline failed.

### Root Cause

The failure came from a merge conflict marker left inside:

- `apps/web/src/components/Sidebar.tsx`

The web build error was caused by unresolved conflict markers like the standard Git merge-marker trio:

```text
start marker
middle separator
end marker
```

This prevented Vite/Babel from parsing the file.

### Recovery

After re-checking the file contents, the conflict markers were no longer present in the working-tree file content, and the web build succeeded again:

```bash
bun run --cwd apps/web build
```

We then re-ran the desktop artifact build successfully.

### Artifact Produced

The successful macOS artifact build produced:

- `release/T3-Code-0.0.14-arm64.dmg`
- `release/T3-Code-0.0.14-arm64.dmg.blockmap`
- `release/T3-Code-0.0.14-arm64.zip`
- `release/T3-Code-0.0.14-arm64.zip.blockmap`
- `release/builder-debug.yml`

### Checksums Recorded

- DMG SHA-256:
  `8c3895ff868c368b3670b2fa3ac4f3dd611ade98248cdf6f740d5280c7e055c8`
- ZIP SHA-256:
  `698e7e7944dd52a2ac5933ae647827a8902d3b7c1028c9a79424151097a8e496`

## New Local Install Workflow

You then asked for a reusable command that would:

- quit the currently running app,
- build a fresh local Electron app,
- copy it into `/Applications`,
- replace the old installed copy,
- launch the new app automatically.

## Files Added And Updated

### 1. `Makefile`

Added a simple top-level `make` target:

- `desktop-install`

Usage:

```bash
make desktop-install
```

### 2. `scripts/install-desktop-local.ts`

Added a new Node/TypeScript script that performs the full local install flow.

What it does:

1. Ensures the script is running on macOS.
2. Clears the temporary local build output directory:
   - `release/local-install`
3. Builds a macOS unpacked app using:
   - `node scripts/build-desktop-artifact.ts --platform mac --target dir --output-dir ...`
4. Recursively finds the generated `.app` bundle.
5. Detects whether the installed app is currently running.
6. Tries to quit the app cleanly via AppleScript using bundle id:
   - `com.t3tools.t3code`
7. Falls back to `pkill` if needed.
8. Removes the existing installed app from:
   - `/Applications/DP Code (Alpha).app`
9. Copies the new `.app` into `/Applications` using `ditto`.
10. Verifies the installed app bundle exists.
11. Launches it with `open`.

### 3. `package.json`

Added a convenience npm/bun script:

```json
"install:desktop:local": "node scripts/install-desktop-local.ts"
```

This means you can also run:

```bash
bun run install:desktop:local
```

### 4. `scripts/build-desktop-artifact.ts`

Updated the existing artifact-copy logic so it can copy directory outputs as well as file outputs.

Why this mattered:

- the existing script handled file artifacts like `.dmg` and `.zip`,
- but the local install flow needs `electron-builder --dir`,
- `--dir` produces a directory like `mac-arm64/...app`,
- the script needed to preserve that directory output so the installer script could use it.

Without this change, the new local installer would not have had the unpacked `.app` bundle to install.

## End-To-End Validation

We ran the full new command:

```bash
make desktop-install
```

It completed successfully and finished with:

```text
Installed and launched /Applications/DP Code (Alpha).app
```

That confirmed the new flow worked end to end:

- build,
- app replacement,
- relaunch.

## Repo Validation

After implementing the new workflow, we ran the required workspace checks:

```bash
bun fmt
bun lint
bun typecheck
```

Status:

- `bun fmt`: passed
- `bun lint`: passed with warnings only
- `bun typecheck`: passed

## Important Notes

### Existing Lint Warnings

`bun lint` still reports pre-existing warnings elsewhere in the repo. They did not block completion, but they are still present.

### Existing Git State

This repository already had unrelated in-progress changes before and during this work, including an unresolved Git index state for:

- `apps/web/src/components/Sidebar.tsx`

The working-tree file content was buildable and allowed the app to compile, but Git still reported that file as `UU` in status output. That repo state was not normalized as part of the install automation task.

## Final Commands To Use

Preferred:

```bash
make desktop-install
```

Alternative:

```bash
bun run install:desktop:local
```

## Final Outcome

You now have a one-command local Electron install workflow that:

- rebuilds the desktop app,
- shuts down the currently installed copy,
- replaces `/Applications/DP Code (Alpha).app`,
- relaunches the new version automatically.
