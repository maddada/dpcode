import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function WorkspaceRouteRedirect() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) {
      return;
    }
    redirectedRef.current = true;
    void navigate({
      to: "/",
      replace: true,
    });
  }, [navigate]);

  return null;
}
