import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { formatDob } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

export function CohortSummary() {
  const { t } = useI18n();
  const { cohortId } = useParams<{ cohortId: string }>();
  const { data, isPending } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });
  const cohort = data?.cohort;
  if (isPending) {
    return (
      <div className="mb-6">
        <TableSkeleton rows={1} cols={5} />
      </div>
    );
  }
  if (!cohort) return null;
  const dates =
    cohort.start_date || cohort.end_date
      ? [formatDob(cohort.start_date), formatDob(cohort.end_date)].filter((d) => d && d !== "—").join(" – ")
      : "—";

  return (
    <Table className="mb-6">
      <TableHeader>
        <TableRow>
          <TableHead>{t("col.code")}</TableHead>
          <TableHead>{t("col.intake")}</TableHead>
          <TableHead>{t("col.programme")}</TableHead>
          <TableHead>{t("col.dates")}</TableHead>
          <TableHead>{t("col.location")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono">{cohort.code || "—"}</TableCell>
          <TableCell>{cohort.name || "—"}</TableCell>
          <TableCell>{cohort.course?.name || "—"}</TableCell>
          <TableCell>{dates}</TableCell>
          <TableCell>{cohort.location || "—"}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
