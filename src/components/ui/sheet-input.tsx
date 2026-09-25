import { useEffect, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, SAVE_TEXT } from "@/lib/utils";

const OUTLINE =
  "outline outline-1 outline-offset-[-1px] outline-transparent hover:outline-primary focus:outline-primary focus-visible:outline-primary focus-visible:ring-0";

const FILL =
  "!block !h-full !min-h-10 !w-full min-w-0 rounded-none border-0 bg-transparent px-3 py-2 shadow-none hover:border-0 hover:bg-transparent focus:border-0 focus-visible:border-0 focus-visible:ring-0";

const CELL = `${FILL} ${OUTLINE}`;

export const CELL_SELECT =
  `${FILL} !flex items-center ${OUTLINE} data-[state=open]:outline-primary data-[state=open]:border-0`;

function SaveButton({
  pending,
  onSave,
}: {
  pending?: boolean;
  onSave: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(SAVE_TEXT, "absolute top-1/2 right-1 z-10 -translate-y-1/2 bg-card/95 px-1")}
      disabled={pending}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSave}
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function SheetInput({
  value,
  onChange,
  onSave,
  pending,
  disabled,
  className,
  placeholder,
  type = "text",
  min,
  max,
}: {
  value: string;
  onChange?: (value: string) => void;
  onSave: (value: string) => void;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  type?: string;
  min?: number | string;
  max?: number | string;
}) {
  const [inner, setInner] = useState(value);
  const [active, setActive] = useState(false);
  useEffect(() => setInner(value), [value]);
  const current = onChange ? value : inner;

  function set(next: string) {
    if (onChange) onChange(next);
    else setInner(next);
  }

  function commit() {
    onSave(current);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div className="relative !h-full !min-h-10 !w-full min-w-0">
      <Input
        type={type}
        min={min}
        max={max}
        className={cn(CELL, className)}
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => {
          window.setTimeout(() => setActive(false), 180);
        }}
        onKeyDown={onKeyDown}
      />
      {active && !disabled ? <SaveButton pending={pending} onSave={commit} /> : null}
    </div>
  );
}

export function SheetTextarea({
  value,
  onChange,
  onSave,
  pending,
  disabled,
  className,
  placeholder,
}: {
  value: string;
  onChange?: (value: string) => void;
  onSave: (value: string) => void;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [inner, setInner] = useState(value);
  const [active, setActive] = useState(false);
  useEffect(() => setInner(value), [value]);
  const current = onChange ? value : inner;

  function set(next: string) {
    if (onChange) onChange(next);
    else setInner(next);
  }

  return (
    <div className="relative !h-full !min-h-10 !w-full min-w-0">
      <Textarea
        className={cn(CELL, "min-h-10 resize-none", className)}
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => {
          window.setTimeout(() => setActive(false), 180);
        }}
      />
      {active && !disabled ? (
        <button
          type="button"
          className={cn(SAVE_TEXT, "absolute top-1 right-1 z-10 bg-card/95 px-1")}
          disabled={pending}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSave(current)}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      ) : null}
    </div>
  );
}
