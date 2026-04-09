import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
