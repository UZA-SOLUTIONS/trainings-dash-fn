import { Link } from "react-router-dom";
import type { Cohort } from "@/services/cohortService";
import { CohortTabs } from "./CohortTabs";
import { PageHeaderSkeleton } from "@/components/feedback/Skeleton";

function formatDate(value?: string | null) {
  if (!value) return null;
  return value;
}

export function CohortClassroomHeader({
  cohort,
  loading,
}: {
  cohort?: Cohort;
  loading?: boolean;
}) {
  const meta = [
    cohort?.course?.name,
    formatDate(cohort?.start_date),
    cohort?.end_date ? `to ${cohort.end_date}` : null,
    cohort?.location,
    cohort?.instructors?.length
      ? cohort.instructors.map((i) => i.full_name || i.email).join(", ")
      : null,
  ].filter(Boolean);

  return (
    <div>
      <Link
        to="/dashboard?tab=cohorts"
        className="inline-flex text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Cohorts
      </Link>
      {loading && !cohort && <div className="mt-6"><PageHeaderSkeleton withMeta withTabs /></div>}
      {cohort && (
        <div className="mt-6">
          <p className="text-eyebrow text-muted-foreground">{cohort.code}</p>
          <h1 className="mt-2 font-display text-4xl font-bold">{cohort.name}</h1>
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{meta.join(" · ")}</p>
          )}
          <CohortTabs cohortId={cohort.id} />
        </div>
      )}
    </div>
  );
}
