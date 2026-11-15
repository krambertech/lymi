import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  /** `warning` says something is out of reach for now, above the controls it disables. */
  tone?: "neutral" | "warning";
  icon: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A short notice inside a screen: a title, at most one line more, and an icon that says what kind. */
export function Notice({ tone = "neutral", icon: Icon, title, children, className }: Props) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl p-4",
        tone === "warning" ? "bg-amber-soft" : "bg-plate-nested",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "warning" ? "text-amber-mark" : "text-ink-muted",
        )}
        aria-hidden="true"
      />
      <div className="grid min-w-0 gap-1">
        <p className="text-base font-medium text-pretty text-ink">{title}</p>
        {children && <p className="text-sm text-pretty text-ink-secondary">{children}</p>}
      </div>
    </div>
  );
}
