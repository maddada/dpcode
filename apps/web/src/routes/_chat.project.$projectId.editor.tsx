import { createFileRoute } from "@tanstack/react-router";

import { parseDiffRouteSearch } from "~/diffRouteSearch";

function ProjectEditorRoute() {
  return null;
}

export const Route = createFileRoute("/_chat/project/$projectId/editor")({
  component: ProjectEditorRoute,
  validateSearch: (search) => parseDiffRouteSearch(search),
});
