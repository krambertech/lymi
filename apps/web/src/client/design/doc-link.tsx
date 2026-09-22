import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { DocRef } from "./registry";

interface Props {
  to: DocRef;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}

/** A typed router link to any page of the design system. */
export function DocLink({ to, className, onClick, children }: Props) {
  const shared = { className, onClick };
  switch (to.kind) {
    case "page":
      return (
        <Link to="/design/$page" params={{ page: to.page }} {...shared}>
          {children}
        </Link>
      );
    case "group":
      return (
        <Link to="/design/components/$group" params={{ group: to.group }} {...shared}>
          {children}
        </Link>
      );
  }
}
