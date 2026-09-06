import type { ReactNode } from "react";
import { DocsShell } from "../docs/DocsShell";

export function Doc({ path, children }: { path: string; children: ReactNode }) {
  return <DocsShell pathname={path}>{children}</DocsShell>;
}
