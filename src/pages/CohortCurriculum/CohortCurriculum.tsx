import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { getCourse } from "@/services/courseService";
import { CohortClassroomHeader } from "@/components/classroom/CohortClassroomHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ListSkeleton } from "@/components/feedback/Skeleton";

export default function CohortCurriculum() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { data: cohortData, isPending: cohortLoading } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const courseId = cohortData?.cohort.course_id;
  const { data: courseData, isPending: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId!),
    enabled: Boolean(courseId),
  });

  const modules = (courseData?.modules ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <CohortClassroomHeader cohort={cohortData?.cohort} loading={cohortLoading} />
      <section className="mt-8">
        {!courseId && !cohortLoading && (
          <EmptyState message="No course is assigned to this class yet. UZA attaches the programme when it publishes the intake." />
        )}
        {courseId && courseLoading && <ListSkeleton />}
        {courseData && (
          <>
            <p className="text-eyebrow text-muted-foreground">{courseData.course.code}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{courseData.course.name}</h2>
            {courseData.course.description && (
              <p className="mt-2 max-w-2xl text-muted-foreground">{courseData.course.description}</p>
            )}
            <div className="mt-6 space-y-3">
              {modules.length === 0 && <EmptyState message="This course has no modules yet." />}
              {modules.map((mod) => (
                <Card key={mod.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {mod.sort_order}. {mod.name}
                      </p>
                      <p className="font-mono text-sm text-primary">{mod.code}</p>
                    </div>
                    <Badge variant="secondary">{mod.duration_hours} h</Badge>
                  </div>
                  {mod.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
