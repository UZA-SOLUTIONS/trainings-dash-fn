import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listCourses } from "@/services/courseService";
import {
  createModule,
  deleteModule,
  downloadModuleAttachment,
  listModules,
  readFileAsBase64,
  updateModule,
  type ModuleAttachment,
  type ModuleContentSection,
  type ModuleStatus,
  type TrainingModule,
} from "@/services/moduleService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { toast } from "sonner";
import { CANCEL_TEXT, DELETE_TEXT, LINK_TEXT, SAVE_TEXT, humanize, statusTone } from "@/lib/utils";

type Draft = {
  id?: string;
  course_id: string;
  name: string;
  code: string;
  description: string;
  content: string;
  contents: ModuleContentSection[];
  attachments: ModuleAttachment[];
  sort_order: string;
  duration_hours: string;
  status: ModuleStatus;
};

const BLANK: Draft = {
  course_id: "",
  name: "",
  code: "",
  description: "",
  content: "",
  contents: [{ title: "", body: "", sort_order: 1 }],
  attachments: [],
  sort_order: "1",
  duration_hours: "4",
  status: "active",
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toDraft(mod: TrainingModule): Draft {
  const contents =
    mod.contents?.length > 0
      ? mod.contents.map((s, i) => ({
          id: s.id,
          title: s.title,
          body: s.body || "",
          sort_order: s.sort_order ?? i + 1,
        }))
      : [{ title: "", body: "", sort_order: 1 }];

  return {
    id: mod.id,
    course_id: mod.course_id,
    name: mod.name,
    code: mod.code,
    description: mod.description ?? "",
    content: mod.content ?? "",
    contents,
    attachments: (mod.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      mime_type: a.mime_type,
      size: a.size,
    })),
    sort_order: String(mod.sort_order ?? 1),
    duration_hours: String(mod.duration_hours ?? 0),
    status: mod.status,
  };
}

export function ModulesPanel() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("modules.write");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TrainingModule | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: modules = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["modules"],
    queryFn: () => listModules(),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
  });

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      const contents = d.contents
        .filter((s) => s.title.trim())
        .map((s, i) => ({
          id: s.id,
          title: s.title.trim(),
          body: s.body.trim(),
          sort_order: i + 1,
        }));

      const payload = {
        course_id: d.course_id,
        name: d.name.trim(),
        code: d.code.trim(),
        description: d.description.trim() || null,
        content: d.content.trim() || null,
        contents,
        attachments: d.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          mime_type: a.mime_type,
          size: a.size,
          ...(a.data ? { data: a.data } : {}),
        })),
        sort_order: Number(d.sort_order) || 1,
        duration_hours: Number(d.duration_hours) || 0,
        status: d.status,
      };
      if (d.id) return updateModule(d.id, payload);
      return createModule(payload);
    },
    onSuccess: (_data, d) => {
      toast.success(d.id ? "Module updated" : "Module created");
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteModule,
    onSuccess: () => {
      toast.success("Module deleted");
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function startEdit(mod: TrainingModule) {
    setDraft(toDraft(mod));
  }

  function updateSection(index: number, patch: Partial<ModuleContentSection>) {
    if (!draft) return;
    const contents = draft.contents.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setDraft({ ...draft, contents });
  }

  function addSection() {
    if (!draft) return;
    setDraft({
      ...draft,
      contents: [
        ...draft.contents,
        { title: "", body: "", sort_order: draft.contents.length + 1 },
      ],
    });
  }

  function removeSection(index: number) {
    if (!draft) return;
    const contents = draft.contents.filter((_, i) => i !== index);
    setDraft({
      ...draft,
      contents: contents.length ? contents : [{ title: "", body: "", sort_order: 1 }],
    });
  }

  async function onFilesSelected(files: FileList | null) {
    if (!draft || !files?.length) return;
    const next = [...draft.attachments];
    for (const file of Array.from(files)) {
      if (file.size > 2_500_000) {
        toast.error(`“${file.name}” is too large (max 2.5 MB)`);
        continue;
      }
      if (next.length >= 8) {
        toast.error("Maximum 8 attachments per module");
        break;
      }
      try {
        const data = await readFileAsBase64(file);
        next.push({
          name: file.name,
          mime_type: file.type || "application/octet-stream",
          size: file.size,
          data,
        });
      } catch {
        toast.error(`Could not read “${file.name}”`);
      }
    }
    setDraft({ ...draft, attachments: next });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(index: number) {
    if (!draft) return;
    setDraft({ ...draft, attachments: draft.attachments.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <PageTitle
        actions={
          canWrite ? (
            <button
              type="button"
              className={SAVE_TEXT}
              onClick={() => setDraft({ ...BLANK, contents: [{ title: "", body: "", sort_order: 1 }] })}
            >
              Add module
            </button>
          ) : undefined
        }
      >
        Modules
      </PageTitle>

      {draft && canWrite && (
        <Card className="mt-6 border-border/70 p-6">
          <h2 className="text-sm">
            {draft.id ? "Edit module" : "Create a module"}
          </h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.course_id) {
                toast.error("Choose a course");
                return;
              }
              saveMutation.mutate(draft);
            }}
          >
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={draft.course_id || undefined}
                onValueChange={(value) => setDraft({ ...draft, course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-name">Name</Label>
              <Input
                id="module-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-code">Code</Label>
              <Input
                id="module-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-order">Order</Label>
              <Input
                id="module-order"
                type="number"
                min={1}
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-hours">Duration (hours)</Label>
              <Input
                id="module-hours"
                type="number"
                min={0}
                value={draft.duration_hours}
                onChange={(e) => setDraft({ ...draft, duration_hours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value: ModuleStatus) => setDraft({ ...draft, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="module-desc">Short description</Label>
              <Input
                id="module-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="One-line summary shown in lists"
              />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="module-content">Full module content</Label>
              <Textarea
                id="module-content"
                className="min-h-[180px]"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Write the full lesson content, instructions, and teaching notes…"
              />
            </div>

            <div className="space-y-3 sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Table of contents</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add each section title and its full content.
                  </p>
                </div>
                <button type="button" className={SAVE_TEXT} onClick={addSection}>
                  Add section
                </button>
              </div>
              <div className="space-y-4">
                {draft.contents.map((section, index) => (
                  <div
                    key={section.id || `section-${index}`}
                    className="rounded-none border border-border/40 p-4"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="w-10 shrink-0 pt-2 text-sm font-medium text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          placeholder="Section title"
                        />
                        <Textarea
                          className="min-h-[100px]"
                          value={section.body}
                          onChange={(e) => updateSection(index, { body: e.target.value })}
                          placeholder="Full content for this section…"
                        />
                      </div>
                      <button
                        type="button"
                        className={DELETE_TEXT}
                        onClick={() => removeSection(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Upload materials</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PDF, Word, PowerPoint, text, or images — up to 2.5 MB each (max 8).
                  </p>
                </div>
                <button
                  type="button"
                  className={SAVE_TEXT}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  onChange={(e) => void onFilesSelected(e.target.files)}
                />
              </div>
              {draft.attachments.length > 0 ? (
                <ul className="divide-y divide-border/40 border border-border/40">
                  {draft.attachments.map((att, index) => (
                    <li
                      key={att.id || `${att.name}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{att.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatBytes(att.size)}
                          {att.data ? " · new upload" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {draft.id && att.id && !att.data && (
                          <button
                            type="button"
                            className={LINK_TEXT}
                            onClick={() => {
                              void downloadModuleAttachment(draft.id!, att.id!, att.name).catch(
                                (e: Error) => toast.error(e.message || "Download failed"),
                              );
                            }}
                          >
                            Download
                          </button>
                        )}
                        <button
                          type="button"
                          className={DELETE_TEXT}
                          onClick={() => removeAttachment(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-none border border-dashed border-border/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No materials uploaded yet.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={SAVE_TEXT} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : draft.id ? "Save changes" : "Create module"}
              </button>
              <button type="button" className={CANCEL_TEXT} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mt-8 overflow-hidden rounded-none border-0 shadow-none">
        {isError ? (
          <div className="p-6">
            <p className="font-medium text-destructive">Could not load modules</p>
            <p className="mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : "Request failed"}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : isPending ? (
          <TableSkeleton cols={canWrite ? 8 : 7} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => {
                  const sectionCount = m.contents?.length || 0;
                  const fileCount = m.attachments?.length || 0;
                  const hasBody = Boolean(m.content?.trim());
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{m.sort_order}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p>{m.name}</p>
                          {m.description && (
                            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.course_name || "—"}
                        {m.course_code ? (
                          <span className="ml-1 font-mono text-xs">({m.course_code})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[
                          hasBody ? "Body" : null,
                          sectionCount ? `${sectionCount} sections` : null,
                          fileCount ? `${fileCount} files` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Empty"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {m.duration_hours}
                      </TableCell>
                      <TableCell className={statusTone(m.status)}>{humanize(m.status)}</TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" className={LINK_TEXT} onClick={() => startEdit(m)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={DELETE_TEXT}
                              disabled={deleteMutation.isPending}
                              onClick={() => setPendingDelete(m)}
                            >
                              Delete
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              {modules.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canWrite ? 8 : 7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No modules yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete module"
        description={pendingDelete ? `Delete module “${pendingDelete.name}”?` : ""}
        confirmLabel="Delete module"
        pending={deleteMutation.isPending}
        onConfirm={async () => {
          if (pendingDelete) await deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
