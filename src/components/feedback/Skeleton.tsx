import type { HTMLAttributes } from "react";
import { m } from "framer-motion";
import { fadeVariants, pageEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const HEAD = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-1",
  "bg-chart-4",
  "bg-chart-5",
] as const;

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-shimmer rounded-none", className)} {...props} />;
}

export function PageHeaderSkeleton({
  withTabs = false,
  withMeta = false,
}: {
  withTabs?: boolean;
  withMeta?: boolean;
}) {
  return (
    <div className="mb-5" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-48 max-w-full" />
      {withMeta && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>
      )}
      {withTabs && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <m.div
      className="overflow-hidden border border-border/40"
      aria-busy="true"
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      <div className="flex">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-10 flex-1 border-r border-background/25 last:border-r-0",
              HEAD[i % HEAD.length],
            )}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b border-border/40 last:border-0">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-border/40 px-3 py-2.5 last:border-r-0">
              <Skeleton className={cn("h-3", i === 0 ? "w-3/4" : "w-full")} />
            </div>
          ))}
        </div>
      ))}
    </m.div>
  );
}

export function CardGridSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <m.div
      className="grid gap-4 xl:grid-cols-3"
      aria-busy="true"
      variants={fadeVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border border-border/40 bg-card">
          <div className="flex">
            <div className="h-10 flex-1 bg-primary" />
            <div className="h-10 flex-1 bg-chart-2" />
          </div>
          <div className="space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </m.div>
  );
}

export function ListSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return <TableSkeleton rows={rows} cols={cols} />;
}

export function DashboardPageSkeleton({
  titleWidth = "w-40",
  withSummary = false,
  cols = 5,
  rows = 8,
}: {
  titleWidth?: string;
  withSummary?: boolean;
  cols?: number;
  rows?: number;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className={cn("mb-5 h-8", titleWidth)} />
      {withSummary && <TableSkeleton rows={1} cols={5} />}
      {withSummary && <div className="mt-4" />}
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-card lg:flex" aria-busy="true" aria-live="polite">
      <aside className="hidden h-screen w-60 shrink-0 bg-primary lg:block">
        <div className="flex h-14 items-center border-b border-primary-foreground/15 px-3">
          <img src="/logo.png" alt="UZA Mobility" className="h-9 w-auto object-contain" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 border-b border-primary-foreground/15" />
        ))}
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col px-4 py-4 lg:px-5">
        <DashboardPageSkeleton withSummary cols={6} />
      </div>
    </div>
  );
}
