import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { StaticNav } from "./nav-link";

/** The end of a whole-row link: what it does, then an arrow that strengthens on hover. */
export function Go({
  children,
  icon,
  className,
}: {
  children?: ReactNode;
  /** The glyph in the circle; an arrow unless the row does something other than open. */
  icon?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center gap-2 text-base font-medium text-text-2",
        className,
      )}
    >
      {/* The circle alone on a phone, where the label would squeeze the text beside it. */}
      {children && <span className="sr-only @3xl:not-sr-only">{children}</span>}
      <span className="edge-inset grid size-8 place-items-center rounded-full bg-plate-2 text-text transition-[background-color,box-shadow] duration-150 group-hover:bg-plate">
        {icon ?? <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />}
      </span>
    </span>
  );
}

/** The other ways to fill an empty screen, inside its start panel under the primary action. */
export function NextSteps({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="grid gap-1">
      {children}
    </ul>
  );
}

interface StepProps {
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  /** A page on the public site. */
  href?: string | undefined;
  /** A screen in the app. */
  to?: "/settings" | undefined;
  /** A group on that screen, e.g. "api-keys". */
  hash?: string | undefined;
  static?: StaticNav;
}

export function NextStep({ icon, title, detail, href, to, hash, static: st }: StepProps) {
  const className =
    "group -mx-2 flex min-h-16 items-center gap-4 rounded-lg px-2 py-2.5 transition-[background-color] duration-150 hoverable:hover:bg-hover";
  const face = (
    <>
      <span
        className="edge-inset grid size-10 shrink-0 place-items-center rounded-full text-text-2 [&_svg]:size-[18px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-md font-medium">{title}</span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
      <Go />
    </>
  );
  return (
    <li>
      {to && !st ? (
        <Link to={to} {...(hash ? { hash } : {})} className={className}>
          {face}
        </Link>
      ) : (
        <a
          href={href ?? (to && hash ? `${to}#${hash}` : to)}
          onClick={st ? (e) => e.preventDefault() : undefined}
          className={className}
        >
          {face}
        </a>
      )}
    </li>
  );
}
