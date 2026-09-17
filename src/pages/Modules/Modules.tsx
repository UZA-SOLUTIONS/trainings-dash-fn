import { Navigate } from "react-router-dom";
import { ModulesPanel } from "@/components/dashboard/ModulesPanel";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceResetKey } from "@/hooks/useWorkspaceResetKey";

export default function Modules() {
  const { canAccessTab } = useAuth();
  const resetKey = useWorkspaceResetKey();

  if (!canAccessTab("modules")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-0 flex-1 pb-8">
      <ModulesPanel key={resetKey} />
    </div>
  );
}
