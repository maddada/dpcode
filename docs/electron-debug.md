# Launch Electron In Debug Mode

This repo has two practical ways to launch the Electron app in debug mode.

## Recommended

Run the full desktop dev stack from the repo root:

```bash
bun run electron:dev
```

What this does:

- Starts the web dev server
- Starts the server/backend
- Starts the Electron desktop shell in dev mode
- Uses a dedicated dev home directory at `./.t3/electron-dev`

If the default dev ports are free, this is the easiest option.

## If The Default Web Port Is Already In Use

Sometimes another local process is already listening on port `5733`, which causes `bun run electron:dev` to fail with:

```text
Error: Port 5733 is already in use
```

You can either stop the process using that port:

```bash
lsof -nP -iTCP:5733 -sTCP:LISTEN
kill <PID>
```

Then rerun:

```bash
bun run electron:dev
```

## Electron-Only Debug Launch

If the web dev server and backend are already running and you only want to attach the Electron shell, run:

```bash
ELECTRON_RENDERER_PORT=5733 \
VITE_DEV_SERVER_URL=http://localhost:5733 \
bun run --cwd apps/desktop dev:electron
```

Use this when:

- `apps/web` is already serving on `http://localhost:5733`
- The backend is already running
- You want to relaunch only the Electron window

## Backend-Only Rebuild

If you change server code and want to rebuild it before relaunching Electron:

```bash
bun run --cwd apps/server build
```

## Useful Notes

- The Electron app title in dev is `DP Code (Dev)`.
- The desktop entry script is `apps/desktop/scripts/dev-electron.mjs`.
- The full combined launcher is wired through the root script `electron:dev`.
- If you want to inspect the running Electron app with an external MCP/debugging tool, launch it first with one of the commands above, then attach your tool to the `DP Code (Dev)` window.
