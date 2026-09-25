import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-none border border-border/40 bg-card py-2 pl-4 pr-3 text-sm shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-normal file:text-foreground placeholder:text-muted-foreground hover:border-primary focus-visible:border-primary focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
