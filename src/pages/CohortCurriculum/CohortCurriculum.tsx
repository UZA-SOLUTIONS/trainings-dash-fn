import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { getCourse } from "@/services/courseService";
import {
  addModuleAttachment,
  downloadModuleAttachment,
  readFileAsBase64,
  removeModuleAttachment,
  type ModuleAttachment,
  type TrainingModule,
} from "@/services/moduleService";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { DocumentPreviewDialog } from "@/components/curriculum/DocumentPreviewDialog";
import { CurriculumTimetable } from "@/components/curriculum/CurriculumTimetable";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn, DELETE_TEXT, LINK_TEXT, SAVE_TEXT } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(att: ModuleAttachment) {
  if (att.mime_type === "application/pdf" || /\.pdf$/i.test(att.name)) return "PDF";
  if (att.mime_type.startsWith("image/")) return "Image";
  if (att.mime_type.startsWith("text/") || /\.(txt|md)$/i.test(att.name)) return "Text";
  if (att.mime_type.includes("word") || /\.docx?$/i.test(att.name)) return "Word";
  if (att.mime_type.includes("powerpoint") || /\.pptx?$/i.test(att.name)) return "Slides";
  return "File";
}

export default function CohortCurriculum() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { t } = useI18n();
  const canWrite = can("curriculum.write");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ moduleId: string; attachment: ModuleAttachment } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<ModuleAttachment | null>(null);

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

  const modules = useMemo(
    () => (courseData?.modules ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [courseData?.modules],
  );

  useEffect(() => {
    if (!modules.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) =>
      current && modules.some((mod) => mod.id === current) ? current : modules[0].id,
    );
  }, [modules]);

  const selected: TrainingModule | undefined = modules.find((mod) => mod.id === selectedId);
  const documents = selected?.attachments ?? [];

  function refreshCourse() {
    queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    queryClient.invalidateQueries({ queryKey: ["modules"] });
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!selected) throw new Error(t("curriculum.chooseModule"));
      const data = await readFileAsBase64(file);
      return addModuleAttachment(selected.id, {
        name: file.name,
        mime_type: file.type || "application/pdf",
        size: file.size,
        data,
      });
    },
    onSuccess: () => {
      toast.success(t("toast.documentAdded"));
      refreshCourse();
    },
    onError: (err: Error) => toast.error(err.message || "Could not add document"),
  });

  const remove = useMutation({
    mutationFn: async (attachment: ModuleAttachment) => {
      if (!selected || !attachment.id) throw new Error("Document not found");
      return removeModuleAttachment(selected.id, attachment.id);
    },
    onSuccess: () => {
      toast.success(t("toast.documentRemoved"));
      setPendingDelete(null);
      refreshCourse();
    },
    onError: (err: Error) => toast.error(err.message || "Could not remove document"),
  });

  async function onFilesSelected(files: FileList | null) {
    if (!files?.length || !selected) return;
    for (const file of Array.from(files)) {
      if (file.size > 2_500_000) {
        toast.error(t("curriculum.fileTooLarge", { name: file.name }));
        continue;
      }
      if (documents.length >= 8) {
        toast.error(t("curriculum.maxDocs"));
        break;
      }
      await upload.mutateAsync(file).catch(() => undefined);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownload(moduleId: string, att: ModuleAttachment) {
    if (!att.id) return;
    void downloadModuleAttachment(moduleId, att.id, att.name).catch((err: Error) =>
      toast.error(err.message || t("toast.downloadFailed")),
    );
  }

  return (
    <div>
      <PageTitle>{t("page.curriculum")}</PageTitle>
      <CohortSummary />
      <section className="space-y-4">
        {!courseId && !cohortLoading && (
          <EmptyState message={t("empty.noCourse")} />
        )}
        {(cohortLoading || (courseId && courseLoading)) && <TableSkeleton cols={5} rows={6} />}
        {courseData && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.programme")}</TableHead>
                  <TableHead>{t("col.code")}</TableHead>
                  <TableHead>{t("col.description")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{courseData.course.name}</TableCell>
                  <TableCell className="font-mono">{courseData.course.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {courseData.course.description || "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {cohortData?.cohort && (
              <CurriculumTimetable
                cohort={cohortData.cohort}
                modules={modules}
                canWrite={canWrite}
              />
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("col.module")}</TableHead>
                  <TableHead>{t("col.code")}</TableHead>
                  <TableHead>{t("col.hours")}</TableHead>
                  <TableHead>{t("col.documents")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {t("empty.noModules")}
                    </TableCell>
                  </TableRow>
                ) : (
                  modules.map((mod) => (
                    <TableRow
                      key={mod.id}
                      className={cn("cursor-pointer", mod.id === selectedId && "bg-accent")}
                      onClick={() => setSelectedId(mod.id)}
                    >
                      <TableCell className="tabular-nums">{mod.sort_order}</TableCell>
                      <TableCell>{mod.name}</TableCell>
                      <TableCell className="font-mono">{mod.code}</TableCell>
                      <TableCell className="tabular-nums">{mod.duration_hours}</TableCell>
                      <TableCell className="tabular-nums">{mod.attachments?.length ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {selected && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("col.moduleNotes")}</TableHead>
                      <TableHead>{t("common.detail")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t("col.title")}</TableCell>
                      <TableCell>
                        {selected.name}{" "}
                        <span className="font-mono text-muted-foreground">({selected.code})</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t("col.summary")}</TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {selected.description || "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t("col.teachingNotes")}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{selected.content || "—"}</TableCell>
                    </TableRow>
                    {(selected.contents ?? []).map((section, index) => (
                      <TableRow key={section.id || `${section.title}-${index}`}>
                        <TableCell>
                          {String(index + 1).padStart(2, "0")}. {section.title}
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap">{section.body || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm">{t("curriculum.docsForModule")}</h2>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          className={SAVE_TEXT}
                          disabled={upload.isPending || documents.length >= 8}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {upload.isPending ? t("action.uploading") : t("action.addPdf")}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf"
                          onChange={(e) => void onFilesSelected(e.target.files)}
                        />
                      </>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("col.document")}</TableHead>
                        <TableHead>{t("col.type")}</TableHead>
                        <TableHead>{t("col.size")}</TableHead>
                        <TableHead>{t("common.open")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground">
                            {t("empty.noDocs")}
                            {canWrite ? t("empty.noDocsHint") : ""}
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents.map((att, index) => (
                          <TableRow key={att.id || `${att.name}-${index}`}>
                            <TableCell>{att.name}</TableCell>
                            <TableCell>{fileKind(att)}</TableCell>
                            <TableCell className="tabular-nums">{formatBytes(att.size)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  className={LINK_TEXT}
                                  onClick={() => setPreview({ moduleId: selected.id, attachment: att })}
                                >
                                  {t("common.view")}
                                </button>
                                <button
                                  type="button"
                                  className={LINK_TEXT}
                                  onClick={() => handleDownload(selected.id, att)}
                                >
                                  {t("common.download")}
                                </button>
                                {canWrite && att.id && (
                                  <button
                                    type="button"
                                    className={DELETE_TEXT}
                                    onClick={() => setPendingDelete(att)}
                                  >
                                    {t("common.remove")}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </section>

      <DocumentPreviewDialog
        moduleId={preview?.moduleId ?? null}
        attachment={preview?.attachment ?? null}
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onDownload={() => {
          if (preview) handleDownload(preview.moduleId, preview.attachment);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("dialog.removeDocument")}
        description={
          pendingDelete
            ? t("dialog.removeDocumentBody", { name: pendingDelete.name })
            : ""
        }
        confirmLabel={t("dialog.removeDocumentConfirm")}
        pending={remove.isPending}
        onConfirm={async () => {
          if (pendingDelete) await remove.mutateAsync(pendingDelete);
        }}
      />
    </div>
  );
}
