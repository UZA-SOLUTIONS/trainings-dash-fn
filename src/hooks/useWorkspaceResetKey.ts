import { useLocation } from "react-router-dom";

type WorkspaceState = { resetWorkspace?: number };

/** Changes when the user re-clicks the current sidebar item so list pages remount (create/edit forms close). */
export function useWorkspaceResetKey() {
  const location = useLocation();
  const reset = (location.state as WorkspaceState | null)?.resetWorkspace;
  return reset ?? 0;
}
