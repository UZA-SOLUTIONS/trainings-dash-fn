import { Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { CLASSROOM_TOOLS, classroomToolFromPath } from "@/components/dashboard/types";
import { PageHeaderSkeleton } from "@/components/feedback/Skeleton";

export function ClassroomLayout() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const location = useLocation();
  const tool = classroomToolFromPath(location.pathname) ?? "roster";
  const title = CLASSROOM_TOOLS.find((entry) => entry.id === tool)?.label ?? "Class";

  const { data, isPending } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const cohort = data?.cohort;
  const meta = [
    cohort?.name,
    cohort?.course?.name,
    cohort?.start_date,
    cohort?.end_date ? `to ${cohort.end_date}` : null,
    cohort?.location,
  ].filter(Boolean);

  return (
    <div>
      {isPending && !cohort && <PageHeaderSkeleton withMeta />}
      {cohort && (
        <div>
          <p className="text-eyebrow text-muted-foreground">{cohort.code}</p>
          <h1 className="mt-2 font-display text-4xl font-bold">{title}</h1>
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}
