import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  createCourse,
  deleteCourse,
  listCourses,
  updateCourse,
  type Course,
  type CourseStatus,
} from "@/services/courseService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { CELL_SELECT, SheetInput } from "@/components/ui/sheet-input";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { toast } from "sonner";
import { CANCEL_TEXT, DELETE_TEXT, humanize, SAVE_TEXT, cn, statusTone } from "@/lib/utils";

type Draft = {
  name: string;
  code: string;
  description: string;
  duration_weeks: string;
  status: CourseStatus;
};

const BLANK: Draft = {
  name: "",
  code: "",
  description: "",
  duration_weeks: "4",
  status: "active",
};

export function CoursesPanel() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const [creating, setCreating] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const { data: courses = [], isPending, isError, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
  });

  const createMutation = useMutation({
    mutationFn: (d: Draft) =>
      createCourse({
        name: d.name.trim(),
        code: d.code.trim(),
        description: d.description.trim() || null,
        duration_weeks: Number(d.duration_weeks) || 4,
        status: d.status,
      }),
    onSuccess: () => {
      toast.success("Course created");
      setCreating(null);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCourse>[1] }) =>
      updateCourse(id, payload),
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      toast.success("Course deleted");
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageTitle
        actions={
          canWrite && !creating ? (
            <button type="button" className={SAVE_TEXT} onClick={() => setCreating({ ...BLANK })}>
              Add course
            </button>
          ) : undefined
        }
      >
        Courses
      </PageTitle>

      <Card className="mt-4 overflow-hidden rounded-none border-0 shadow-none">
        {isError ? (
          <div className="p-6">
            <p className="font-medium text-destructive">Could not load courses</p>
            <p className="mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : "Request failed"}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : isPending ? (
          <TableSkeleton cols={canWrite ? 7 : 6} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {creating && (
                <TableRow>
                  <TableCell>
                    <SheetInput
                      value={creating.name}
                      onChange={(name) => setCreating({ ...creating, name })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                      placeholder="Name"
                    />
                  </TableCell>
                  <TableCell>
                    <SheetInput
                      className="text-muted-foreground"
                      value={creating.description}
                      onChange={(description) => setCreating({ ...creating, description })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                      placeholder="Description"
                    />
                  </TableCell>
                  <TableCell>
                    <SheetInput
                      value={creating.code}
                      onChange={(code) => setCreating({ ...creating, code })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                      placeholder="Code"
                    />
                  </TableCell>
                  <TableCell>
                    <SheetInput
                      type="number"
                      min={1}
                      value={creating.duration_weeks}
                      onChange={(duration_weeks) => setCreating({ ...creating, duration_weeks })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">0</TableCell>
                  <TableCell>
                    <Select
                      value={creating.status}
                      onValueChange={(status: CourseStatus) => setCreating({ ...creating, status })}
                    >
                      <SelectTrigger className={CELL_SELECT}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <button type="button" className={CANCEL_TEXT} onClick={() => setCreating(null)}>
                        Cancel
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              )}
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        value={c.name}
                        onSave={(name) => updateMutation.mutate({ id: c.id, payload: { name } })}
                        pending={pending}
                      />
                    ) : (
                      c.name
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        className="text-muted-foreground"
                        value={c.description ?? ""}
                        onSave={(description) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { description: description.trim() || null },
                          })
                        }
                        pending={pending}
                        placeholder="Description"
                      />
                    ) : (
                      <span className="line-clamp-1 text-muted-foreground">{c.description || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {canWrite ? (
                      <SheetInput
                        className="font-mono"
                        value={c.code}
                        onSave={(code) => updateMutation.mutate({ id: c.id, payload: { code } })}
                        pending={pending}
                      />
                    ) : (
                      c.code
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        type="number"
                        min={1}
                        value={String(c.duration_weeks)}
                        onSave={(weeks) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { duration_weeks: Number(weeks) || 4 },
                          })
                        }
                        pending={pending}
                      />
                    ) : (
                      `${c.duration_weeks} week${c.duration_weeks === 1 ? "" : "s"}`
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{c.module_count ?? 0}</TableCell>
                  <TableCell className={canWrite ? "p-0" : statusTone(c.status)}>
                    {canWrite ? (
                      <Select
                        value={c.status}
                        onValueChange={(status: CourseStatus) =>
                          updateMutation.mutate({ id: c.id, payload: { status } })
                        }
                      >
                        <SelectTrigger className={cn(CELL_SELECT, statusTone(c.status))}>
                          <SelectValue>{humanize(c.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className={statusTone("active")}>Active</SelectItem>
                          <SelectItem value="draft" className={statusTone("draft")}>Draft</SelectItem>
                          <SelectItem value="archived" className={statusTone("archived")}>Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      humanize(c.status)
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <button
                        type="button"
                        className={DELETE_TEXT}
                        disabled={deleteMutation.isPending}
                        onClick={() => setPendingDelete(c)}
                      >
                        Delete
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {courses.length === 0 && !creating && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    No courses yet.
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
        title="Delete course"
        description={
          pendingDelete ? `Delete course “${pendingDelete.name}”? Its modules will also be deleted.` : ""
        }
        confirmLabel="Delete course"
        pending={deleteMutation.isPending}
        onConfirm={async () => {
          if (pendingDelete) await deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
