import * as React from "react";
import { cn } from "@/lib/utils";

function lockColumnWidths(table: HTMLTableElement) {
  if (table.dataset.colsLocked === "1") return;
  const heads = [...table.querySelectorAll("thead th")] as HTMLElement[];
  let total = 0;
  heads.forEach((th) => {
    const w = Math.round(th.getBoundingClientRect().width);
    total += w;
    th.style.width = `${w}px`;
    th.style.minWidth = `${w}px`;
  });
  table.style.tableLayout = "fixed";
  table.style.width = `${total}px`;
  table.dataset.colsLocked = "1";
}

function syncTableWidth(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll("thead th")] as HTMLElement[];
  const total = heads.reduce((sum, th) => sum + th.offsetWidth, 0);
  table.style.width = `${total}px`;
}

function startPointerDrag(
  event: React.PointerEvent,
  axis: "x" | "y",
  onDelta: (delta: number) => void,
) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const origin = axis === "x" ? event.clientX : event.clientY;
  const previousUserSelect = document.body.style.userSelect;
  const previousCursor = document.body.style.cursor;
  document.body.style.userSelect = "none";
  document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";

  function move(ev: PointerEvent) {
    onDelta((axis === "x" ? ev.clientX : ev.clientY) - origin);
  }
  function up() {
    document.body.style.userSelect = previousUserSelect;
    document.body.style.cursor = previousCursor;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  }
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto bg-card">
      <table
        ref={ref}
        className={cn("w-full caption-bottom border-collapse text-sm leading-snug", className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("sticky top-0 z-10 [&_tr]:hover:bg-transparent", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("bg-card", className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  const localRef = React.useRef<HTMLTableCellElement>(null);

  function setRefs(node: HTMLTableCellElement | null) {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function resizeColumn(event: React.PointerEvent) {
    const th = localRef.current;
    if (!th) return;
    const table = th.closest("table");
    if (table) lockColumnWidths(table);
    const startWidth = th.getBoundingClientRect().width;
    startPointerDrag(event, "x", (delta) => {
      const next = Math.max(48, Math.round(startWidth + delta));
      th.style.width = `${next}px`;
      th.style.minWidth = `${next}px`;
      th.style.maxWidth = `${next}px`;
      if (table) syncTableWidth(table);
    });
  }

  return (
    <th
      ref={setRefs}
      className={cn(
        "relative h-10 overflow-hidden whitespace-nowrap border border-background/25 px-3 py-2 text-left align-middle text-sm font-normal",
        "bg-primary text-primary-foreground",
        "nth-[5n+2]:bg-chart-2 nth-[5n+2]:text-primary-foreground",
        "nth-[5n+3]:bg-chart-1 nth-[5n+3]:text-volt-foreground",
        "nth-[5n+4]:bg-chart-4 nth-[5n+4]:text-volt-foreground",
        "nth-[5n+5]:bg-chart-5 nth-[5n+5]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        className="absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize hover:bg-primary-foreground/50"
        onPointerDown={resizeColumn}
      />
    </th>
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  const localRef = React.useRef<HTMLTableCellElement>(null);

  function setRefs(node: HTMLTableCellElement | null) {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function resizeRow(event: React.PointerEvent) {
    const td = localRef.current;
    const tr = td?.closest("tr");
    if (!tr) return;
    const startHeight = tr.getBoundingClientRect().height;
    startPointerDrag(event, "y", (delta) => {
      const next = Math.max(28, Math.round(startHeight + delta));
      tr.style.height = `${next}px`;
      tr.querySelectorAll("td").forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.height = `${next}px`;
        el.style.maxHeight = `${next}px`;
        el.style.overflow = "hidden";
      });
    });
  }

  return (
    <td
      ref={setRefs}
      className={cn(
        "relative h-full min-h-10 border border-border/40 bg-inherit px-3 py-2 align-middle",
        "has-[input]:p-0 has-[textarea]:p-0 has-[[role=combobox]]:p-0",
        "[&:has(input)>div]:size-full [&:has(textarea)>div]:size-full",
        "[&_input]:size-full [&_textarea]:size-full [&_[role=combobox]]:size-full",
        className,
      )}
      {...props}
    >
      {children}
      <span
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize row"
        className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-row-resize hover:bg-primary/50"
        onPointerDown={resizeRow}
      />
    </td>
  );
});
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
