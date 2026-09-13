import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { Rating } from "@lymi/core";
import { clsx } from "clsx";
import { Brain, Check, type LucideIcon, RotateCcw, Zap } from "lucide-react";
import type { CSSProperties } from "react";

export const GRADES: {
  rating: Rating;
  label: MessageDescriptor;
  key: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  { rating: 1, label: msg`Forgot`, key: "1", icon: RotateCcw, iconClass: "text-grade-forgot" },
  { rating: 2, label: msg`Hard`, key: "2", icon: Brain, iconClass: "text-grade-hard" },
  { rating: 3, label: msg`Good`, key: "3", icon: Check, iconClass: "text-grade-good" },
  { rating: 4, label: msg`Easy`, key: "4", icon: Zap, iconClass: "text-grade-easy" },
];

interface MarkProps {
  icon: LucideIcon;
  iconClass?: string | undefined;
  /** `sm` sits on the timeline; `md` leads a History row. */
  size?: "sm" | "md" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/** An icon in a fixed square, so a column of marks lines up whatever the glyph. */
export function Mark({
  icon: Icon,
  iconClass = "text-muted",
  size = "md",
  className,
  style,
}: MarkProps) {
  return (
    <i
      aria-hidden="true"
      style={style}
      className={clsx(
        "grid shrink-0 place-items-center",
        size === "sm" ? "size-4 [&_svg]:size-3" : "size-5 [&_svg]:size-4",
        className,
      )}
    >
      <Icon className={iconClass} strokeWidth={2.25} />
    </i>
  );
}

/** A grade as the review screen draws it: the same icon and colour as its button. */
export function GradeMark({
  rating,
  ...props
}: { rating: number } & Omit<MarkProps, "icon" | "iconClass">) {
  const grade = GRADES.find((g) => g.rating === rating) ?? GRADES[2];
  return grade ? <Mark icon={grade.icon} iconClass={grade.iconClass} {...props} /> : null;
}
