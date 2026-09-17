import { Navigate } from "react-router-dom";
import { CoursesPanel } from "@/components/dashboard/CoursesPanel";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceResetKey } from "@/hooks/useWorkspaceResetKey";

export default function Courses() {
  const { canAccessTab } = useAuth();
  const resetKey = useWorkspaceResetKey();

  if (!canAccessTab("courses")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-0 flex-1 pb-8">
      <CoursesPanel key={resetKey} />
    </div>
  );
}
