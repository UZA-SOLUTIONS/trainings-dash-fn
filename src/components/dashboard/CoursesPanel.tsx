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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

type Draft = {
  id?: string;
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

function statusBadge(status: Course["status"]) {
  if (status === "active") return <Badge className="bg-primary/15 text-primary">Active</Badge>;
  if (status === "draft") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">Archived</Badge>;
}

export function CoursesPanel() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const { data: courses = [], isPending, isError, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
  });

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name: d.name.trim(),
        code: d.code.trim(),
        description: d.description.trim() || null,
        duration_weeks: Number(d.duration_weeks) || 4,
        status: d.status,
      };
      if (d.id) return updateCourse(d.id, payload);
      return createCourse(payload);
    },
    onSuccess: (_data, d) => {
      toast.success(d.id ? "Course updated" : "Course created");
      setDraft(null);
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

  function startEdit(course: Course) {
    setDraft({
      id: course.id,
      name: course.name,
      code: course.code,
      description: course.description ?? "",
      duration_weeks: String(course.duration_weeks ?? 4),
      status: course.status,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Training</p>
          <h1 className="mt-1 font-display text-4xl font-bold">Courses</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Create, update, and manage training courses in the programme.
          </p>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setDraft({ ...BLANK })}>
            Add course
          </Button>
        )}
      </div>

      {draft && canWrite && (
        <Card className="mt-6 border-border/70 p-6">
          <h2 className="font-display text-xl font-semibold">
            {draft.id ? "Edit course" : "Create a course"}
          </h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(draft);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="course-name">Name</Label>
              <Input
                id="course-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-code">Code</Label>
              <Input
                id="course-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-weeks">Duration (weeks)</Label>
              <Input
                id="course-weeks"
                type="number"
                min={1}
                value={draft.duration_weeks}
                onChange={(e) => setDraft({ ...draft, duration_weeks: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value: CourseStatus) => setDraft({ ...draft, status: value })}
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
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="course-desc">Description</Label>
              <Input
                id="course-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : draft.id ? "Save changes" : "Create course"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mt-8 overflow-hidden border-border/70">
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
          <TableSkeleton cols={canWrite ? 6 : 5} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium">{c.name}</p>
                        {c.description && (
                          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.duration_weeks} week{c.duration_weeks === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="tabular-nums">{c.module_count ?? 0}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(c)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => setPendingDelete(c)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {courses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canWrite ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
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
          pendingDelete
            ? `Delete course “${pendingDelete.name}”? Its modules will also be deleted.`
            : ""
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
