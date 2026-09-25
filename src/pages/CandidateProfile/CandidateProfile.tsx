import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate } from "@/services/candidateService";
import { CertificatePreviewDialog } from "@/components/certificate/CertificatePreviewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPageSkeleton } from "@/components/feedback/Skeleton";
import { FadeIn } from "@/components/motion/FadeIn";
import { PageTitle } from "@/components/layout/PageTitle";
import { LINK_TEXT, cn, scoreTone, statusTone } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { t, label } = useI18n();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });

  const candidate = data?.candidate;
  const cohort = data?.cohort;

  return (
    <div>
      <PageTitle>{t("page.candidate")}</PageTitle>
      <Link
        to="/dashboard?tab=candidates"
        className={LINK_TEXT}
      >
        {t("common.candidatesBack")}
      </Link>

      {isPending && <DashboardPageSkeleton cols={3} rows={5} />}

      {isError && (
        <p className="mt-6 text-destructive">{error instanceof Error ? error.message : t("candidate.loadFail")}</p>
      )}

      {candidate && (
        <FadeIn>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-muted-foreground">{candidate.candidate_code}</p>
              <h2 className="mt-1 text-2xl">{candidate.full_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {cohort?.name ?? "—"} ·{" "}
                <span className={statusTone(candidate.status)}>{label(candidate.status)}</span>
                {" · "}
                <span className={statusTone(candidate.training_status)}>
                  {label(candidate.training_status)}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              {cohort && (
                <Link to={`/cohorts/${cohort.id}`} className={LINK_TEXT}>
                  {t("common.openCohort")}
                </Link>
              )}
              {candidate.status === "graduated" && (
                <button type="button" className={LINK_TEXT} onClick={() => setPreviewOpen(true)}>
                  {t("common.printCertificate")}
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.identity")}</TableHead>
                  <TableHead>{t("common.value")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t("col.nationalId")}</TableCell>
                  <TableCell>{candidate.national_id || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.phone")}</TableCell>
                  <TableCell>{candidate.phone || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.email")}</TableCell>
                  <TableCell>{candidate.email || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.dob")}</TableCell>
                  <TableCell>{candidate.date_of_birth || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.gender")}</TableCell>
                  <TableCell>{candidate.gender || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.district")}</TableCell>
                  <TableCell>{candidate.district || "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.training")}</TableHead>
                  <TableHead>{t("common.value")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t("nav.attendance")}</TableCell>
                  <TableCell className={scoreTone(candidate.attendance_percentage)}>
                    {candidate.attendance_percentage != null ? `${candidate.attendance_percentage}%` : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.examScore")}</TableCell>
                  <TableCell className={scoreTone(candidate.exam_score)}>
                    {candidate.exam_score != null ? `${candidate.exam_score}%` : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("col.notes")}</TableCell>
                  <TableCell>{candidate.instructor_notes || "—"}</TableCell>
                </TableRow>
                {candidate.disqualification_reason && (
                  <TableRow>
                    <TableCell>{t("candidate.disqualification")}</TableCell>
                    <TableCell>{candidate.disqualification_reason}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.issue")}</TableHead>
                  <TableHead>{t("col.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.issues.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      {t("empty.noIssues")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.issues.slice(0, 6).map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{issue.title}</TableCell>
                      <TableCell className={statusTone(issue.status)}>{label(issue.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <section className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.date")}</TableHead>
                  <TableHead>{t("col.session")}</TableHead>
                  <TableHead>{t("col.status")}</TableHead>
                  <TableHead>{t("col.activity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recent_sessions.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      {t("empty.noSessions")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recent_sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.date}</TableCell>
                      <TableCell>{label(s.session_label)}</TableCell>
                      <TableCell className={statusTone(s.status)}>
                        {s.status ? label(s.status) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.activity_notes ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <section className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.assessment")}</TableHead>
                  <TableHead>{t("col.type")}</TableHead>
                  <TableHead>{t("col.score")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.scores.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      {t("empty.noAssessmentsShort")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.scores.map((s) => {
                    const pct = s.score == null || !s.max_score ? null : Math.round((s.score / s.max_score) * 100);
                    return (
                    <TableRow key={s.assessment_id}>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>{label(s.type)}</TableCell>
                      <TableCell className={cn("tabular-nums", scoreTone(pct))}>
                        {s.score == null ? "—" : `${s.score} / ${s.max_score}`}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </FadeIn>
      )}
      <CertificatePreviewDialog
        candidateId={candidate?.id ?? null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
