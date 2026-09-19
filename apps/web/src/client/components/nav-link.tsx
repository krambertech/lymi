import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * The design page renders the shell with no router under it. Passing `static` swaps every
 * router link for a plain anchor and forces the active path, so one component serves both.
 */
export type StaticNav = { path: string } | undefined;

interface Props {
  to: string;
  params?: Record<string, string> | undefined;
  hash?: string | undefined;
  /** Match the path exactly. Needed for "/", which prefixes everything. */
  exact?: boolean | undefined;
  className: string;
  st: StaticNav;
  describedBy?: string | undefined;
  children: ReactNode;
}

/** A router link, or a dead anchor carrying the same classes on the design page. */
export function NavLink({ to, params, hash, exact, className, st, describedBy, children }: Props) {
  if (st) {
    const path = Object.entries(params ?? {}).reduce(
      (filled, [name, value]) => filled.replace(`$${name}`, value),
      to,
    );
    const href = hash ? `${path}#${hash}` : path;
    return (
      <a
        href={href}
        className={clsx(className, st.path === href && "active")}
        aria-current={st.path === href ? "page" : undefined}
        aria-describedby={describedBy}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      to={to}
      params={params ?? {}}
      {...(hash ? { hash } : {})}
      activeOptions={{ exact: !!exact }}
      className={className}
      aria-describedby={describedBy}
    >
      {children}
    </Link>
  );
}
