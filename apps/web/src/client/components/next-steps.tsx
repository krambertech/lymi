import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useStaticNav } from "./nav-link";

interface GoProps {
  children?: ReactNode;
  /** An icon in a circle, for a row that does something other than open, such as a plus. */
  icon?: ReactNode | undefined;
  /** A plain mark in place of the chevron, such as an expand arrow. */
  glyph?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * The end of a whole-row link: what it does, then a chevron that strengthens on hover.
 * A row that does something other than open, such as New cards' plus, puts its icon in a circle.
 */
export function Go({ children, icon, glyph, className }: GoProps) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center gap-1.5 text-base font-medium text-ink-secondary",
        className,
      )}
    >
      {/* The mark alone on a phone, where the label would squeeze the text beside it. */}
      {children && <span className="sr-only @3xl:not-sr-only">{children}</span>}
      {icon ? (
        <span className="edge-inset grid size-8 place-items-center rounded-full bg-plate-nested text-ink transition-[background-color,box-shadow] duration-150 hoverable:group-hover:bg-plate">
          {icon}
        </span>
      ) : (
        <span className="grid size-5 place-items-center text-ink-muted transition-colors duration-150 hoverable:group-hover:text-ink [&_svg]:size-[18px]">
          {glyph ?? <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />}
        </span>
      )}
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
}

type NextStepProps = NextStepBase &
  (
    | { /** A page on the public site. */ href: string; to?: never; hash?: never; onClick?: never }
    | {
        /** A screen in the app. */
        to: "/settings";
        /** A group on that screen, e.g. "api-keys". */
        hash?: string | undefined;
        href?: never;
        onClick?: never;
      }
    | {
        /** Something done in place, such as opening a dialog. */
        onClick: () => void;
        href?: never;
        to?: never;
        hash?: never;
      }
  );

export function NextStep(props: NextStepProps) {
  const { icon, title, detail } = props;
  const st = useStaticNav();
  const className =
    "group -mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-4 rounded-sm px-2 py-2.5 text-start transition-[background-color] duration-150 hoverable:hover:veil";
  const face = (
    <>
      <span
        className="edge-inset grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary [&_svg]:size-[18px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-md font-medium">{title}</span>
        <span className="text-sm text-ink-muted">{detail}</span>
      </span>
      <Go />
    </>
  );
  return (
    <li>
      {props.to ? (
        <NavLink to={props.to} {...(props.hash ? { hash: props.hash } : {})} className={className}>
          {face}
        </NavLink>
      ) : props.onClick ? (
        <button type="button" onClick={props.onClick} className={className}>
          {face}
        </button>
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
