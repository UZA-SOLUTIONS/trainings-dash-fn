import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { createCohort, deleteCohort, updateCohort, type Cohort } from "@/services/cohortService";
import { listCourses } from "@/services/courseService";
import { Card } from "@/components/ui/card";
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
import { PageTitle } from "@/components/layout/PageTitle";
import { toast } from "sonner";
import { CANCEL_TEXT, DELETE_TEXT, SAVE_TEXT, LINK_TEXT } from "@/lib/utils";

type Candidate = { cohort_id: string; status: string };

type Draft = {
  name: string;
  code: string;
  capacity: string;
  location: string;
  start_date: string;
  end_date: string;
  course_id: string;
};

const BLANK: Draft = {
  name: "",
  code: "",
  capacity: "30",
  location: "",
  start_date: "",
  end_date: "",
  course_id: "",
};

export function CohortsPanel({
  cohorts,
  candidates,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
}) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("cohorts.write");
  const [creating, setCreating] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Cohort | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
    enabled: canWrite,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["manage-overview"] });
    queryClient.invalidateQueries({ queryKey: ["cohort"] });
  }

  const createMutation = useMutation({
    mutationFn: (d: Draft) =>
      createCohort({
        name: d.name.trim(),
        code: d.code.trim(),
        capacity: Number(d.capacity) || 30,
        location: d.location.trim() || null,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        course_id: d.course_id || null,
      }),
    onSuccess: () => {
      toast.success("Cohort created");
      setCreating(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCohort>[1] }) =>
      updateCohort(id, payload),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCohort,
    onSuccess: () => {
      toast.success("Cohort deleted");
      setPendingDelete(null);
      invalidate();
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
              New cohort
            </button>
          ) : undefined
        }
      >
        Classes
      </PageTitle>

      <Card className="mt-4 overflow-hidden rounded-none border-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
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
                      className="font-mono"
                      value={creating.code}
                      onChange={(code) => setCreating({ ...creating, code })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                      placeholder="Code"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={creating.course_id || "none"}
                      onValueChange={(course_id) =>
                        setCreating({ ...creating, course_id: course_id === "none" ? "" : course_id })
                      }
                    >
                      <SelectTrigger className={CELL_SELECT}>
                        <SelectValue placeholder="No course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No course</SelectItem>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <SheetInput
                      type="date"
                      value={creating.start_date}
                      onChange={(start_date) => setCreating({ ...creating, start_date })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <SheetInput
                      type="date"
                      value={creating.end_date}
                      onChange={(end_date) => setCreating({ ...creating, end_date })}
                      onSave={() => createMutation.mutate(creating)}
                      pending={pending}
                    />
                  </TableCell>
                <TableCell>
                  <SheetInput
                    type="number"
                    value={creating.capacity}
                    onChange={(capacity) => setCreating({ ...creating, capacity })}
                    onSave={() => createMutation.mutate(creating)}
                    pending={pending}
                  />
                </TableCell>
                <TableCell>
                  <SheetInput
                    value={creating.location}
                    onChange={(location) => setCreating({ ...creating, location })}
                    onSave={() => createMutation.mutate(creating)}
                    pending={pending}
                    placeholder="Location"
                  />
                </TableCell>
                <TableCell>
                  <button type="button" className={CANCEL_TEXT} onClick={() => setCreating(null)}>
                    Cancel
                  </button>
                </TableCell>
              </TableRow>
            )}
            {cohorts.map((c) => {
              const enrolled = candidates.filter(
                (row) => row.cohort_id === c.id && (row.status === "enrolled" || row.status === "graduated"),
              ).length;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        value={c.name}
                        onSave={(name) => updateMutation.mutate({ id: c.id, payload: { name } })}
                        pending={pending}
                      />
                    ) : (
                      <Link to={`/cohorts/${c.id}`} className={LINK_TEXT}>
                        {c.name}
                      </Link>
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
                      <span className="text-primary">{c.code}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Select
                        value={c.course_id || "none"}
                        onValueChange={(v) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { course_id: v === "none" ? null : v },
                          })
                        }
                      >
                        <SelectTrigger className={CELL_SELECT}>
                          <SelectValue>{c.course?.name ?? "No course"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No course</SelectItem>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      c.course?.name ?? "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        type="date"
                        value={c.start_date ?? ""}
                        onSave={(start_date) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { start_date: start_date || null },
                          })
                        }
                        pending={pending}
                      />
                    ) : (
                      c.start_date || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        type="date"
                        value={c.end_date ?? ""}
                        onSave={(end_date) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { end_date: end_date || null },
                          })
                        }
                        pending={pending}
                      />
                    ) : (
                      c.end_date || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        type="number"
                        value={String(c.capacity)}
                        onSave={(capacity) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { capacity: Number(capacity) || 30 },
                          })
                        }
                        pending={pending}
                      />
                    ) : (
                      `${enrolled}/${c.capacity}`
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <SheetInput
                        value={c.location ?? ""}
                        onSave={(location) =>
                          updateMutation.mutate({
                            id: c.id,
                            payload: { location: location.trim() || null },
                          })
                        }
                        pending={pending}
                        placeholder="—"
                      />
                    ) : (
                      c.location || "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link to={`/cohorts/${c.id}`} className={LINK_TEXT}>
                        Open
                      </Link>
                      {canWrite && (
                        <button
                          type="button"
                          className={DELETE_TEXT}
                          onClick={() => setPendingDelete(c)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete cohort"
        description={
          pendingDelete ? `Delete cohort “${pendingDelete.name}”? Candidates must be removed first.` : ""
        }
        confirmLabel="Delete cohort"
        pending={deleteMutation.isPending}
        onConfirm={async () => {
          if (pendingDelete) await deleteMutation.mutateAsync(pendingDelete.id);
        }}
      />
    </div>
  );
}
