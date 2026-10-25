import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  href: string;
  children: ReactNode;
  size?: "sm" | "md" | undefined;
  className?: string | undefined;
}

/** A quiet link on to another page, under a section's copy. */
export function ArrowLink({ href, children, size = "sm", className }: Props) {
  return (
    <a
      href={href}
      className={clsx(
        className,
        "inline-flex items-center gap-1.5 rounded-xs",
        size === "sm" ? "text-sm" : "text-md",
        "font-medium text-text-2 hoverable:hover:text-text",
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </a>
  );
}
