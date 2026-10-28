import type { ReactNode } from "react";

/** A link into the docs, from a sentence in Settings. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-ink underline decoration-edge-strong underline-offset-2 hoverable:hover:decoration-current"
    >
      {children}
    </a>
  );
}
