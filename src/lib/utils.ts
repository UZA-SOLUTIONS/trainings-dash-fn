import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ACTION =
  "bg-transparent p-0 text-sm hover:underline disabled:cursor-not-allowed disabled:opacity-50";

/** Red — Delete / Remove */
export const DELETE_TEXT = `${ACTION} !text-destructive`;
/** Green — Save / Add / Create / New */
export const SAVE_TEXT = `${ACTION} !text-primary`;
/** Blue — Open / Profile / Edit / Download */
export const LINK_TEXT = `${ACTION} !text-chart-5`;
/** Muted — Cancel / Close */
export const CANCEL_TEXT = `${ACTION} text-muted-foreground`;

/** `in_progress` → `In progress` */
export function humanize(value: string) {
  if (!value) return value;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** `1998-03-21` → `03/21/1998` */
export function formatDob(value: string | null | undefined) {
  if (!value) return "—";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
}

export const PASS_PCT = 50;

const STATUS_TONE: Record<string, string> = {
  enrolled: "!bg-primary/15 text-primary",
  waitlisted: "!bg-chart-4/25 text-chart-4",
  graduated: "!bg-chart-1/20 text-chart-1",
  rejected: "!bg-destructive/20 !text-destructive font-medium",
  withdrawn: "!bg-muted text-muted-foreground",
  not_started: "!bg-muted text-muted-foreground",
  in_progress: "!bg-chart-4/25 text-chart-4",
  completed: "!bg-primary/15 text-primary",
  failed: "!bg-destructive/20 !text-destructive font-medium",
  open: "!bg-chart-4/25 text-chart-4",
  resolved: "!bg-primary/15 text-primary",
  low: "!bg-chart-5/20 text-chart-5",
  medium: "!bg-chart-4/25 text-chart-4",
  high: "!bg-destructive/20 !text-destructive font-medium",
  present: "!bg-primary/15 text-primary",
  late: "!bg-chart-4/25 text-chart-4",
  tardy: "!bg-chart-4/25 text-chart-4",
  absent: "!bg-destructive/20 !text-destructive font-medium",
  unexcused: "!bg-destructive/20 !text-destructive font-medium",
  excused: "!bg-chart-5/20 text-chart-5",
  active: "!bg-primary/15 text-primary",
  draft: "!bg-muted text-muted-foreground",
  archived: "!bg-muted text-muted-foreground",
};

export function statusTone(value: string | null | undefined) {
  if (!value) return "text-muted-foreground";
  const key = value.toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_TONE[key] ?? STATUS_TONE[key.replace(/_absence$/, "")] ?? "";
}

export function scoreTone(pct: number | null | undefined) {
  if (pct == null || Number.isNaN(pct)) return "text-muted-foreground";
  if (pct < PASS_PCT) return "!bg-destructive/20 !text-destructive font-medium";
  if (pct < 70) return "!bg-chart-4/25 text-chart-4";
  if (pct < 85) return "!bg-chart-5/20 text-chart-5";
  return "!bg-primary/15 text-primary font-medium";
}

export function scoreOutcome(pct: number | null | undefined, isFinal = false) {
  if (pct == null || Number.isNaN(pct)) {
    return { label: "Unmarked", className: "text-muted-foreground" };
  }
  if (pct < PASS_PCT) {
    return {
      label: isFinal ? "Failed" : "Needs improvement",
      className: "!bg-destructive/20 !text-destructive font-medium",
    };
  }
  if (pct < 70) return { label: "Pass", className: "!bg-chart-4/25 text-chart-4" };
  if (pct < 85) return { label: "Merit", className: "!bg-chart-5/20 text-chart-5" };
  return { label: "Distinction", className: "!bg-primary/15 text-primary font-medium" };
}

