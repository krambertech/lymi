import { clsx } from "clsx";
import { AlertCircle, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  tone: "success" | "danger" | "neutral";
  children: ReactNode;
  title?: ReactNode | undefined;
  role?: "alert" | "status" | undefined;
  className?: string | undefined;
}

/** A consistent status surface for the signed-out flows. */
export function AuthNotice({ tone, children, title, role, className }: Props) {
  const Icon = tone === "success" ? CircleCheck : tone === "danger" ? AlertCircle : Info;

  return (
    <div
      role={role}
      className={clsx(
        "flex items-start gap-3 rounded-md p-4 text-start",
        tone === "success" && "bg-good-soft",
        tone === "danger" && "bg-danger-soft",
        tone === "neutral" && "bg-plate-2",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.75}
        className={clsx(
          "mt-0.5 size-5 shrink-0",
          tone === "success" && "text-good",
          tone === "danger" && "text-danger",
          tone === "neutral" && "text-muted",
        )}
      />
      <div className="min-w-0">
        {title && <p className="text-base font-medium text-text">{title}</p>}
        <div
          className={clsx(
            "text-sm leading-relaxed",
            title && "mt-1",
            tone === "danger" ? "text-danger" : "text-text-2",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
