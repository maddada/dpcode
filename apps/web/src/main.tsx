import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { createHashHistory, createBrowserHistory } from "@tanstack/react-router";

import "@fontsource-variable/jetbrains-mono";
import "@xterm/xterm/css/xterm.css";
import "./index.css";

import { isElectron } from "./env";
import { getRouter } from "./router";
import { APP_DISPLAY_NAME } from "./branding";
import { installVSmuxEmbedBridge, isVSmuxEmbed } from "./vsmuxEmbed";

// Electron loads the app from a file-backed shell, so hash history avoids path resolution issues.
const history = isElectron || isVSmuxEmbed() ? createHashHistory() : createBrowserHistory();

const router = getRouter(history);
installVSmuxEmbedBridge();

document.title = APP_DISPLAY_NAME;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
