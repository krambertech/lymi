import type { ReactNode } from "react";
import { Localized } from "../Localized";
import { Queries } from "./Queries";

interface Props {
  locale?: string | undefined;
  children: ReactNode;
}

/** What a page's island wraps its view in: the page's language and a query client. */
export function Island({ locale, children }: Props) {
  return (
    <Localized locale={locale}>
      <Queries>{children}</Queries>
    </Localized>
  );
}
