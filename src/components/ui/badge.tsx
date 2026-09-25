import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border border-border/40 px-2 py-0.5 text-xs font-normal",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-none hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-none hover:bg-destructive/80",
        outline: "text-foreground shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
