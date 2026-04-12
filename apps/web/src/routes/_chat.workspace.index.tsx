import { createFileRoute } from "@tanstack/react-router";

import { WorkspaceRouteRedirect } from "./workspaceRouteRedirect";

export const Route = createFileRoute("/_chat/workspace/")({
  component: WorkspaceRouteRedirect,
});
