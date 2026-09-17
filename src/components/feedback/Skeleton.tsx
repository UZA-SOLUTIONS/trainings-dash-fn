import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function PageHeaderSkeleton({
  withTabs = false,
  withMeta = false,
}: {
  withTabs?: boolean;
  withMeta?: boolean;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-10 w-72 max-w-full" />
      {withMeta && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-24" />
        </div>
      )}
      {withTabs && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border" aria-busy="true">
      <div className="grid gap-0">
        <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 border-b px-4 py-4 last:border-0">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-9 w-32" />
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
