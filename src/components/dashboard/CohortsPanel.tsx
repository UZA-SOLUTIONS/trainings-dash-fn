import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { createCohort, deleteCohort, updateCohort, type Cohort } from "@/services/cohortService";
import { listCourses } from "@/services/courseService";
import { listStaffAccounts } from "@/services/authService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";

type Candidate = { cohort_id: string; status: string };

type Draft = {
  id?: string;
  name: string;
  code: string;
  capacity: string;
  location: string;
  start_date: string;
  end_date: string;
  notes: string;
  course_id: string;
  instructor_ids: string[];
};

const BLANK: Draft = {
  name: "",
  code: "",
  capacity: "30",
  location: "",
  start_date: "",
  end_date: "",
  notes: "",
  course_id: "",
  instructor_ids: [],
};

export function CohortsPanel({
  cohorts,
  candidates,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
}) {
  const queryClient = useQueryClient();
  const { can, isAdmin } = useAuth();
  const canWrite = can("cohorts.write");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Cohort | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
    enabled: Boolean(draft),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: listStaffAccounts,
    enabled: Boolean(draft) && isAdmin,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["manage-overview"] });
    queryClient.invalidateQueries({ queryKey: ["cohort"] });
  }

  const saveMutation = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name: d.name.trim(),
        code: d.code.trim(),
        capacity: Number(d.capacity) || 30,
        location: d.location.trim() || null,
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        notes: d.notes.trim() || null,
        course_id: d.course_id || null,
        instructor_ids: d.instructor_ids,
      };
      if (d.id) return updateCohort(d.id, payload);
      return createCohort(payload);
    },
    onSuccess: (_data, d) => {
      toast.success(d.id ? "Cohort updated" : "Cohort created");
      setDraft(null);
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

  function toggleInstructor(id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      instructor_ids: draft.instructor_ids.includes(id)
        ? draft.instructor_ids.filter((x) => x !== id)
        : [...draft.instructor_ids, id],
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Training</p>
          <h1 className="mt-1 font-display text-4xl font-bold">Classes</h1>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setDraft({ ...BLANK })}>
            New cohort
          </Button>
        )}
      </div>

      {draft && (
        <Card className="mt-6 grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input
              type="number"
              value={draft.capacity}
              onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select
              value={draft.course_id || "none"}
              onValueChange={(v) => setDraft({ ...draft, course_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={draft.start_date}
              onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input
              type="date"
              value={draft.end_date}
              onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          {isAdmin && (
            <div className="space-y-2 md:col-span-2">
              <Label>Instructors</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {staff
                  .filter((s) => s.role === "instructor" || s.role === "admin")
                  .map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.instructor_ids.includes(s.id)}
                        onCheckedChange={() => toggleInstructor(s.id)}
                      />
                      {s.full_name || s.email}
                    </label>
                  ))}
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(draft)}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohort</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.map((c) => {
              const enrolled = candidates.filter(
                (row) => row.cohort_id === c.id && (row.status === "enrolled" || row.status === "graduated"),
              ).length;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`/cohorts/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="font-mono text-sm text-primary">{c.code}</p>
                  </TableCell>
                  <TableCell>{c.course?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.start_date || c.end_date ? `${c.start_date ?? "—"} → ${c.end_date ?? "—"}` : "—"}
                  </TableCell>
                  <TableCell>
                    {enrolled}/{c.capacity}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/cohorts/${c.id}`}>View</Link>
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDraft({
                                id: c.id,
                                name: c.name,
                                code: c.code,
                                capacity: String(c.capacity),
                                location: c.location ?? "",
                                start_date: c.start_date ?? "",
                                end_date: c.end_date ?? "",
                                notes: c.notes ?? "",
                                course_id: c.course_id ?? "",
                                instructor_ids: c.instructor_ids ?? [],
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => setPendingDelete(c)}
                          >
                            Delete
                          </Button>
                        </>
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
          pendingDelete
            ? `Delete cohort “${pendingDelete.name}”? Candidates must be removed first.`
            : ""
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
