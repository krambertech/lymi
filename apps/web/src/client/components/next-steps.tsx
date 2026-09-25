import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { StaticNav } from "./nav-link";

interface GoProps {
  children?: ReactNode;
  /** The glyph in the circle; an arrow unless the row does something other than open. */
  icon?: ReactNode | undefined;
  className?: string | undefined;
}

interface GoProps {
  children?: ReactNode;
  /** The glyph in the circle; an arrow unless the row does something other than open. */
  icon?: ReactNode | undefined;
  className?: string | undefined;
}

/** The end of a whole-row link: what it does, then an arrow that strengthens on hover. */
export function Go({ children, icon, className }: GoProps) {
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

interface NextStepsProps {
  label: string;
  children: ReactNode;
}

/** The other ways to fill an empty screen, inside its start panel under the primary action. */
export function NextSteps({ label, children }: NextStepsProps) {
  return (
    <ul aria-label={label} className="grid gap-1">
      {children}
    </ul>
  );
}

interface NextStepBase {
  icon: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  static?: StaticNav;
}

type NextStepProps = NextStepBase &
  (
    | { /** A page on the public site. */ href: string; to?: never; hash?: never }
    | {
        /** A screen in the app. */
        to: "/settings";
        /** A group on that screen, e.g. "api-keys". */
        hash?: string | undefined;
        href?: never;
      }
  );

export function NextStep(props: NextStepProps) {
  const { icon, title, detail, static: st } = props;
  const className =
    "group -mx-2 flex min-h-16 items-center gap-4 rounded-sm px-2 py-2.5 transition-[background-color] duration-150 hoverable:hover:bg-hover";
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
  // Inert on the design page, which draws these rows without leaving it.
  return (
    <li>
      {props.to ? (
        <Link
          to={props.to}
          {...(props.hash ? { hash: props.hash } : {})}
          disabled={!!st}
          className={className}
        >
          {face}
        </Link>
      ) : (
        <a
          href={props.href}
          onClick={st ? (e) => e.preventDefault() : undefined}
          className={className}
        >
          {face}
        </a>
      )}
    </li>
  );
}
