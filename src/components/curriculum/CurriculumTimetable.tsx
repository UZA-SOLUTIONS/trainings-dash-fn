import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateCohortTimetable,
  type Cohort,
  type TimetableDay,
  type TimetableEntry,
} from "@/services/cohortService";
import type { TrainingModule } from "@/services/moduleService";
import { CELL_SELECT } from "@/components/ui/sheet-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn, DELETE_TEXT, SAVE_TEXT } from "@/lib/utils";

const DAYS: Array<{ id: TimetableDay; label: string }> = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
];

const DEFAULT_SLOTS = [
  { start_time: "08:00", end_time: "10:00" },
  { start_time: "10:15", end_time: "12:15" },
  { start_time: "12:15", end_time: "13:15" },
  { start_time: "13:15", end_time: "15:15" },
  { start_time: "15:30", end_time: "17:00" },
];

const ACTIVITIES = [
  { value: "free", label: "Free" },
  { value: "break", label: "Break" },
  { value: "yard", label: "Yard / practical" },
] as const;

type Slot = { start_time: string; end_time: string };

function slotKey(slot: Slot) {
  return `${slot.start_time}|${slot.end_time}`;
}

function slotsFrom(entries: TimetableEntry[]): Slot[] {
  const seen = new Map<string, Slot>();
  for (const row of entries) {
    const slot = { start_time: row.start_time, end_time: row.end_time };
    seen.set(slotKey(slot), slot);
  }
  return [...seen.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function suggestedEntries(modules: TrainingModule[]): TimetableEntry[] {
  let i = 0;
  return DAYS.flatMap((day) =>
    DEFAULT_SLOTS.map((slot) => {
      if (slot.start_time === "12:15") {
        return {
          day: day.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          module_id: null,
          title: "Break",
          room: null,
          notes: null,
        };
      }
      const mod = modules[i % Math.max(modules.length, 1)];
      i += 1;
      return {
        day: day.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        module_id: mod?.id ?? null,
        title: null,
        room: null,
        notes: null,
      };
    }),
  );
}

function cellValue(entry: TimetableEntry | undefined) {
  if (!entry) return "free";
  if (entry.module_id) return entry.module_id;
  if (entry.title === "Break") return "break";
  if (entry.title === "Yard / practical") return "yard";
  if (entry.title) return `title:${entry.title}`;
  return "free";
}

function entryFromValue(
  day: TimetableDay,
  slot: Slot,
  value: string,
  previous: TimetableEntry | undefined,
): TimetableEntry | null {
  if (value === "free") {
    return {
      ...previous,
      day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      module_id: null,
      title: null,
      room: previous?.room ?? null,
      notes: previous?.notes ?? null,
    };
  }
  if (value === "break") {
    return {
      ...previous,
      day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      module_id: null,
      title: "Break",
      room: previous?.room ?? null,
      notes: previous?.notes ?? null,
    };
  }
  if (value === "yard") {
    return {
      ...previous,
      day,
      start_time: slot.start_time,
      end_time: slot.end_time,
      module_id: null,
      title: "Yard / practical",
      room: previous?.room ?? null,
      notes: previous?.notes ?? null,
    };
  }
  return {
    ...previous,
    day,
    start_time: slot.start_time,
    end_time: slot.end_time,
    module_id: value,
    title: null,
    room: previous?.room ?? null,
    notes: previous?.notes ?? null,
  };
}

function findEntry(entries: TimetableEntry[], day: TimetableDay, slot: Slot) {
  return entries.find(
    (row) => row.day === day && row.start_time === slot.start_time && row.end_time === slot.end_time,
  );
}

export function CurriculumTimetable({
  cohort,
  modules,
  canWrite,
}: {
  cohort: Cohort;
  modules: TrainingModule[];
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const saved = cohort.timetable ?? [];
  const [entries, setEntries] = useState<TimetableEntry[]>(
    saved.length ? saved : suggestedEntries(modules),
  );
  const seeded = useRef<string | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => {
    const existing = cohort.timetable ?? [];
    if (existing.length) {
      setEntries(existing);
      return;
    }
    const suggested = suggestedEntries(modules);
    setEntries(suggested);
    if (canWrite && modules.length && seeded.current !== cohort.id) {
      seeded.current = cohort.id;
      window.setTimeout(() => save.mutate(suggested), 0);
    }
  }, [cohort.id, modules, canWrite]);

  const slots = useMemo(() => {
    const fromEntries = slotsFrom(entries);
    return fromEntries.length ? fromEntries : DEFAULT_SLOTS;
  }, [entries]);

  const save = useMutation({
    mutationFn: (next: TimetableEntry[]) =>
      updateCohortTimetable(
        cohort.id,
        next.map(({ id, ...row }) => ({
          ...(id ? { id } : {}),
          ...row,
          module_id: row.module_id || null,
        })),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["cohort", cohort.id],
        (old: { cohort: Cohort; candidates?: unknown } | undefined) =>
          old ? { ...old, cohort: { ...old.cohort, ...updated } } : old,
      );
    },
    onError: (err: Error) => toast.error(err.message || "Could not save timetable"),
  });

  function persist(next: TimetableEntry[]) {
    setEntries(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save.mutate(next), 200);
  }

  function setCell(day: TimetableDay, slot: Slot, value: string) {
    const previous = findEntry(entries, day, slot);
    const nextCell = entryFromValue(day, slot, value, previous);
    const without = entries.filter(
      (row) => !(row.day === day && row.start_time === slot.start_time && row.end_time === slot.end_time),
    );
    persist(nextCell ? [...without, nextCell] : without);
  }

  function addPeriod() {
    const last = slots[slots.length - 1];
    const [h, m] = (last?.end_time ?? "17:00").split(":").map(Number);
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const endH = Math.min(23, h + 1);
    const end = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    persist([
      ...entries,
      ...DAYS.map((day) => ({
        day: day.id,
        start_time: start,
        end_time: end,
        module_id: null,
        title: null,
        room: null,
        notes: null,
      })),
    ]);
  }

  function removePeriod(slot: Slot) {
    persist(
      entries.filter((row) => !(row.start_time === slot.start_time && row.end_time === slot.end_time)),
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm">Weekly timetable</h2>
        {canWrite && (
          <div className="flex gap-3">
            {save.isPending ? <span className="text-sm text-muted-foreground">Saving…</span> : null}
            <button type="button" className={SAVE_TEXT} onClick={addPeriod}>
              Add period
            </button>
          </div>
        )}
      </div>
      <div className="overflow-auto border border-border/40">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[9rem] border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground">
                Time
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.id}
                  className="min-w-[9rem] border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground"
                >
                  {day.label}
                </th>
              ))}
              {canWrite && (
                <th className="w-16 border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground">
                  {" "}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slotKey(slot)}>
                <td className="sticky left-0 z-10 border border-border/40 bg-card px-2 py-1.5 tabular-nums">
                  {slot.start_time}–{slot.end_time}
                </td>
                {DAYS.map((day) => {
                  const entry = findEntry(entries, day.id, slot);
                  const value = cellValue(entry);
                  const label =
                    entry?.module_id
                      ? modules.find((mod) => mod.id === entry.module_id)?.name
                      : entry?.title;
                  return (
                    <td
                      key={day.id}
                      className={cn(
                        "border border-border/40 p-0",
                        value === "break" && "bg-muted",
                        value === "yard" && "bg-chart-4/15",
                        entry?.module_id && "bg-primary/10",
                      )}
                    >
                      {canWrite ? (
                        <Select value={value} onValueChange={(next) => setCell(day.id, slot, next)}>
                          <SelectTrigger className={CELL_SELECT}>
                            <SelectValue>{label || "Free"}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITIES.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                            {modules.map((mod) => (
                              <SelectItem key={mod.id} value={mod.id}>
                                {mod.code} · {mod.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="block px-2 py-1.5">{label || "Free"}</span>
                      )}
                    </td>
                  );
                })}
                {canWrite && (
                  <td className="border border-border/40 px-2 py-1.5">
                    <button type="button" className={DELETE_TEXT} onClick={() => removePeriod(slot)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
