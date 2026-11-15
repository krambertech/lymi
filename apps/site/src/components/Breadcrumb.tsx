import { useLingui } from "@lingui/react/macro";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  /** The page one level up. */
  parent: { href: string; label: ReactNode };
  /** This page's name. */
  here: ReactNode;
}

/** The way back up one level, above a page's headline. */
export function Breadcrumb({ parent, here }: Props) {
  const { t } = useLingui();
  return (
    <nav aria-label={t`Breadcrumb`}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <li>
          <a
            href={parent.href}
            className="rounded-xs font-medium text-ink-secondary transition-colors duration-150 hoverable:hover:text-ink"
          >
            {parent.label}
          </a>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5 text-ink-faint rtl:-scale-x-100" />
        </li>
        <li aria-current="page">{here}</li>
      </ol>
    </nav>
  );
}
