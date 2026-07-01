import { cn } from "@/lib/utils";

/** Gradient ring spinner using the Digital Sky accent. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "brand-spinner inline-block size-4 animate-spin",
        className
      )}
    />
  );
}
