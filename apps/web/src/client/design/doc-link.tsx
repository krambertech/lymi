import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import type { DocRef } from "./registry";

interface Props extends Omit<ComponentProps<"a">, "href" | "target"> {
  to: DocRef;
}

/** A typed router link to any page of the design system. */
export function DocLink({ to, ...anchor }: Props) {
  switch (to.kind) {
    case "page":
      return <Link to="/design/$page" params={{ page: to.page }} {...anchor} />;
    case "group":
      return <Link to="/design/components/$group" params={{ group: to.group }} {...anchor} />;
  }
}
