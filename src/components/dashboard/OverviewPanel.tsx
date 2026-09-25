import { Link } from "react-router-dom";
import { FiCalendar, FiEdit3, FiAlertCircle } from "react-icons/fi";
import { OverviewActivity } from "@/components/dashboard/OverviewActivity";
import { OverviewVisuals } from "@/components/dashboard/OverviewVisuals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classroomHref } from "@/components/dashboard/types";
import { PageTitle } from "@/components/layout/PageTitle";
import { cn, LINK_TEXT } from "@/lib/utils";
import { useActiveCohort } from "@/hooks/useActiveCohort";
import type { Cohort } from "@/services/cohortService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Candidate = {
  cohort_id: string;
  status: string;
  training_status: string;
};

export function OverviewPanel({
  cohorts,
  candidates,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
}) {
  const { activeCohort, activeCohortId, setActiveCohort } = useActiveCohort();
  const scopedCohorts = activeCohort ? [activeCohort] : cohorts;
  const scopedCandidates = activeCohort
    ? candidates.filter((row) => row.cohort_id === activeCohort.id)
    : candidates;
  const canSwitchIntake = cohorts.length > 1;
  const intakeMeta = activeCohort
    ? [
        canSwitchIntake ? null : activeCohort.name,
        activeCohort.course?.name,
        activeCohort.start_date || activeCohort.end_date
          ? `${activeCohort.start_date ?? "—"} → ${activeCohort.end_date ?? "—"}`
          : null,
      ].filter(Boolean)
    : [];

  const shortcuts = [
    { tool: "attendance" as const, label: "Attendance", icon: FiCalendar },
    { tool: "assessments" as const, label: "Marks", icon: FiEdit3 },
    { tool: "issues" as const, label: "Issues", icon: FiAlertCircle },
  ];

  return (
    <div className="pb-4">
      <PageTitle
        description={intakeMeta.length > 0 ? intakeMeta.join(" · ") : undefined}
        actions={
          canSwitchIntake ? (
            <div className="w-full sm:max-w-xs">
              <p className="mb-1.5 text-xs text-muted-foreground">Intake</p>
              <Select value={activeCohortId ?? undefined} onValueChange={setActiveCohort}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select an intake" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                      {cohort.code ? ` (${cohort.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : undefined
        }
      >
        Overview
      </PageTitle>

      {activeCohortId && (
        <Table className="mt-5">
          <TableHeader>
            <TableRow>
              {shortcuts.map(({ tool, label }) => (
                <TableHead key={tool}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {shortcuts.map(({ tool, label, icon: Icon }) => (
                <TableCell key={tool} className="p-0">
                  <Link
                    to={classroomHref(tool, activeCohortId)}
                    className={cn("flex items-center gap-2 px-3 py-2 hover:bg-accent/60", LINK_TEXT)}
                  >
                    <Icon size={16} aria-hidden />
                    Open {label.toLowerCase()}
                  </Link>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )}

      <OverviewVisuals className="mt-5" cohorts={scopedCohorts} candidates={scopedCandidates} />
      {activeCohortId ? <OverviewActivity cohortId={activeCohortId} /> : null}
    </div>
  );
}
